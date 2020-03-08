import { ChannelResolvable, Collection, GuildResolvable, Snowflake, UserResolvable } from 'discord.js';
import mongoose = require('mongoose');
import { setInterval } from 'timers';

import { Bot } from '..';
import { cleanInterval } from '../bot-config.json';
import { CommandResolvable } from '../commands';
import { PermLevel } from '../utils/permissions';
import {
    resolveChannel,
    resolveChannelID,
    resolveCommand,
    resolveGuild,
    resolveUser,
    resolveUserID,
} from '../utils/resolvers';
import { toNano } from '../utils/time';
import { OptionalFields } from './schemas/global.js';
import { CaseDoc, caseSchema } from './schemas/main/case.js';
import { CommandCacheDoc, CommandCacheObject, commandCacheSchema } from './schemas/main/commandCache.js';
import { FiltersDoc, filtersSchema } from './schemas/main/filter.js';
import { GuildDoc, GuildObject, guildSchema } from './schemas/main/guild.js';
import { LogDoc, logSchema } from './schemas/main/log.js';
import { PActionDoc, pActionSchema } from './schemas/main/pAction.js';
import { UserDoc, UserObject, userSchema } from './schemas/main/user.js';
import { CommandCacheWrapper } from './wrappers/commandCacheWrapper';
import { GuildWrapper } from './wrappers/guildWrapper';
import { UserWrapper } from './wrappers/userWrapper';

/**
 * Manages all connections to the main database and settings database
 *
 * @export
 * @class Database
 */
export class Database {
    /**
     * represents the main database with all collections and the actual connection
     *
     * @type {{connection: mongoose.Connection;guilds: mongoose.Model<GuildDoc>;staff: mongoose.Model<staffDoc>;prefix: mongoose.Model<prefixDoc>;commands: mongoose.Model<commandsDoc>;filters: mongoose.Model<FiltersDoc>;logs: mongoose.Model<LogDoc>;commandCache: mongoose.Model<CommandCacheDoc>;}}
     * @memberof Database
     */
    mainDB: {
        connection: mongoose.Connection;
        guilds: mongoose.Model<GuildDoc>;
        filters: mongoose.Model<FiltersDoc>;
        logs: mongoose.Model<LogDoc>;
        commandCache: mongoose.Model<CommandCacheDoc>;
        users: mongoose.Model<UserDoc>;
        cases: mongoose.Model<CaseDoc>;
        pActions: mongoose.Model<PActionDoc>;
    };

    cache: {
        guilds: Collection<Snowflake, GuildWrapper>;
        users: Collection<Snowflake, UserWrapper>;
        commandCaches: Collection<String, CommandCacheWrapper>; // key is `${channel.id} {user.id}`
    };

    /**
     * Creates an instance of Database and connections to the main and settings database.
     * 
     * @param {{ url: string, suffix: string }} clusterInfo object containing the url and suffix for the cluster
     * @memberof Database
     */
    constructor(clusterInfo: { url: string, suffix: string }) {
        // create connection with main database
        var mainCon = mongoose.createConnection(clusterInfo.url + '/main' + clusterInfo.suffix, { useNewUrlParser: true });
        mainCon.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        mainCon.once('open', function () {
            console.log('connected to /main database');
            // setup model (doc definition) for every collection
            Bot.database.mainDB = {
                connection: mainCon,
                guilds: mainCon.model('guild', guildSchema, 'guilds'),
                filters: mainCon.model('filters', filtersSchema, 'filters'),
                logs: mainCon.model('log', logSchema, 'logs'),
                commandCache: mainCon.model('commandCache', commandCacheSchema, 'commandCaches'),
                users: mainCon.model('user', userSchema, 'users'),
                cases: mainCon.model('cases', caseSchema, 'cases'),
                pActions: mainCon.model('pActions', pActionSchema, 'pAction')
            };

            Bot.database.cache = {
                guilds: new Collection(),
                users: new Collection(),
                commandCaches: new Collection()
            };

            // clean unused data from database at a certain interval
            setInterval(async () => {
                await Bot.database.cleanGuilds();
                Bot.database.cleanCommandCaches();
                Bot.database.cleanUsers();
                //console.log('cleaned database');
            }, cleanInterval);
            console.info(`cleaning database every ${cleanInterval}ms`);
        });
    }

    /**
     * pings cluster and returns the ping latency
     *
     * @returns
     * @memberof Database
     */
    async ping() {
        var currentNano = process.hrtime();
        await this.mainDB.connection.db.command({ ping: 1 });
        return toNano(process.hrtime(currentNano));
    }

    /**
     * return guild search query
     *
     * @param {string} guildID id of guild of which t find the doc
     * @returns
     * @memberof Database
     */
    findGuildDoc(guildID: string, projection?: string[]) {
        return this.mainDB.guilds.findOne({ id: guildID }, projection).exec();
    }

    /**
     * Returns a GuildWrapper for the specified guild. 
     *
     * @export
     * @param {GuildResolvable} guild The guild to get the wrapper for
     * @param {OptionalFields<GuildObject>} [fields] Only those fields should be loaded (Can also be a single value)
     * @returns GuildWrapper of the specified guild
     * @memberof Database
     */
    async getGuildWrapper(guildResolvable: GuildResolvable, fields?: OptionalFields<GuildObject>) {
        let guild = resolveGuild(guildResolvable);
        if (!guild) return undefined;

        let guildWrapper = this.cache.guilds.get(guild.id)
        if (!guildWrapper) {
            guildWrapper = new GuildWrapper(guild.id, guild);
            this.cache.guilds.set(guild.id, guildWrapper);
        }
        if (!guildWrapper) return undefined;
        await guildWrapper.load(fields);
        return guildWrapper;
    }

    /**
     * adds guild to guild and staff collections
     *
     * @param {*} guildID id of guild that should be added
     * @returns
     * @memberof Database
     */
    async addGuild(guildID) {
        var guildDoc = await this.findGuildDoc(guildID)
        if (!guildDoc) {
            guildDoc = new this.mainDB.guilds({
                id: guildID,
                logChannel: undefined,
                logs: [],
                webhooks: {
                    youtube: []
                },
                commandSettings: {},
                ranks: {
                    admins: [],
                    mods: [],
                    immune: []
                },
                megalog: {
                    ignoreChannels: []
                }
            });
        }
        return await guildDoc.save();
    }

    /**
     * removes all docs related to specified guild in database
     *
     * @param {string} guildID id of guild that should be removed
     * @memberof Database
     */
    async removeGuild(guildID: string) {
        this.cache.guilds.delete(guildID);
        for (const webhookDoc of await Bot.youtube.webhooks.find({ guild: guildID })) {
            Bot.youtube.deleteWebhook(guildID, webhookDoc.toObject().channel, webhookDoc.toObject().feed);
        }
        this.mainDB.guilds.deleteOne({ id: guildID }).exec();
        this.mainDB.filters.deleteOne({ guild: guildID }).exec();
        this.mainDB.logs.deleteMany({ guild: guildID }).exec();
        this.mainDB.cases.deleteMany({ guild: guildID }).exec();
        this.mainDB.pActions.deleteMany({ 'info.guild': guildID }).exec();
    }

    /**
     * cleans the database from guilds, which the bot isn't in anymore
     *
     * @memberof Database
     */
    async cleanGuilds() {
        let guildDocs = await this.mainDB.guilds.find({}, ['guild']);
        for (const guildDoc of guildDocs) {
            if (!Bot.client.guilds.get(guildDoc.id)) {
                await this.removeGuild(guildDoc.id);
            }
        }
    }

    /**
     * find filter settings doc of specified guild
     *
     * @param {string} guildID if of guild of which to find the filters doc
     * @returns
     * @memberof Database
     */
    findFiltersDoc(guildID: string) {
        return this.mainDB.filters.findOne({ guild: guildID }).exec();
    }

    /**
     * gets guild specific filter settings of certain filter
     * if doc isn't undefined but it got deleted in the database, it will return null
     *
     * @param {string} guildID id of guild where the settings should be taken
     * @param {string} filter filter name
     * @param {FiltersDoc} [doc] existing filters doc where the settings should be extracted
     * @returns filter settings
     * @memberof Database
     */
    async getFilterSettings(guildID: string, filter: string, doc?: FiltersDoc) {
        var filterSettings = doc;
        if (!filterSettings || filterSettings.guild != guildID)
            filterSettings = await this.findFiltersDoc(guildID);
        if (!filterSettings) return undefined;
        filterSettings = filterSettings.toObject().filters
        if (filter in filterSettings) return filterSettings[filter];
        return undefined;
    }

    /**
     * sets settings of specific filter in a guild
     * if doc isn't undefined but it got deleted in the database, it won't change anything
     *
     * @param {string} guildID id of guild where the settings should be set
     * @param {string} filter filter name
     * @param {*} settings settings that should be set
     * @param {FiltersDoc} [doc] existing filters doc where the settings should be inserted
     * @returns whole filter doc
     * @memberof Database
     */
    async setFilterSettings(guildID: string, filter: string, settings: any, doc?: FiltersDoc) {
        if (!doc || doc.guild != guildID) {
            doc = await this.findFiltersDoc(guildID);
        }
        if (!doc) {
            doc = new this.mainDB.filters({
                guild: guildID,
                filters: {}
            });
        }
        doc.filters[filter] = settings;
        doc.markModified('filters.' + filter);
        return await doc.save();
    }

    /**
     * will try to find a specific commandCache
     *
     * @param {string} channelID channel ID
     * @param {string} userID user ID
     * @param {Number} [timestamp=Date.now()] Timestamp of when the CommandCache was valid (Default: Date.now())
     * @returns
     * @memberof Database
     */
    findCommandCacheDoc(channelID: string, userID: string, timestamp: Number = Date.now()) {
        return this.mainDB.commandCache.findOne({ channel: channelID, user: userID, delete: { $gt: timestamp } }).exec();
    }

    /**
     * Returns key associated with the CommandCache used for internal caching
     *
     * @private
     * @param {ChannelResolvable} channel
     * @param {UserResolvable} user
     * @returns
     * @memberof Database
     */
    private getCommandCacheKey(channel: ChannelResolvable, user: UserResolvable) {
        return `${resolveChannelID(channel)} ${resolveUserID(user)}`;
    }

    /**
     * Creates (or overwrites) a new CommandCache with the provided values
     *
     * @param {ChannelResolvable} channel Channel in which the CommandCache should be valid
     * @param {UserResolvable} user user associated with the CommandCache
     * @param {CommandResolvable} command Command that created the CommandCache
     * @param {PermLevel} permLevel What permissions level this command can be executed
     * @param {number} expirationTimestamp When the CommandCache expires
     * @param {object} [cache={}] Cache it should have (Default {})
     * @returns CommandCacheWrapper if creation was successful
     * @memberof Database
     */
    async createCommandCache(channel: ChannelResolvable, user: UserResolvable, command: CommandResolvable, permLevel: PermLevel, expirationTimestamp: number, cache: any = {}) {
        let channelObj = resolveChannel(channel);
        let userObj = await resolveUser(user);
        let commandObj = resolveCommand(command);

        let commandCache = new CommandCacheWrapper(channelObj, userObj);
        commandCache = await commandCache.init(commandObj, permLevel, cache, expirationTimestamp);
        if (!commandCache)
            throw new Error(`CommandCache initialization failed with following properties: ${JSON.stringify({
                channel: channelObj.id,
                user: userObj.id,
                command: commandObj.name,
                permLevel: permLevel,
                expirationTimestamp: expirationTimestamp,
                cache: cache
            })}`);

        let key = this.getCommandCacheKey(channelObj.id, userObj.id);
        this.cache.commandCaches.set(key, commandCache);
        return commandCache;
    }

    /**
     * Gets the searched CommandCache from the database
     *
     * @param {ChannelResolvable} channel Channel for commandCache
     * @param {UserResolvable} user User for commandCache
     * @param {OptionalFields<GuildObject>} [fields] Only those fields should be loaded (Can also be a single value)
     * @returns CommandCacheWrapper if it found one
     * @memberof Database
     */
    async findCommandCache(channel: ChannelResolvable, user: UserResolvable, fields?: OptionalFields<CommandCacheObject>) {
        let channelObj = resolveChannel(channel);
        let userObj = await resolveUser(user);
        let cacheKey = this.getCommandCacheKey(channelObj, userObj);

        let commandCache = this.cache.commandCaches.get(cacheKey);
        if (!commandCache) return undefined;
        if (commandCache.removed) {
            this.cache.commandCaches.delete(cacheKey);
            return undefined;
        }
        commandCache.load(fields);
        return commandCache;
    }

    /**
     * deletes all old CommandCaches
     *
     * @returns
     * @memberof Database
     */
    cleanCommandCaches() {
        for (const cache of this.cache.commandCaches) {
            if (!cache[1].isExpired() && !cache[1].removed) continue;
            this.cache.commandCaches.delete(cache[0]);
        }
        return this.mainDB.commandCache.deleteMany({ delete: { $lt: Date.now() } }).exec();
    }

    /**
     * makes a query to find a doc of a specific user
     *
     * @param {string} userID user id
     * @returns user doc if one was found
     * @memberof Database
     */
    findUserDoc(userID: string) {
        return this.mainDB.users.findOne({ user: userID }).exec();
    }

    /**
     * Gets a UserWrapper for a given user and caches it
     *
     * @param {UserResolvable} userResolvable User for which to get a wrapper
     * @param {OptionalFields<UserObject>} [fields] Only those fields should be loaded (Can also be a single value)
     * @returns UserWrapper for the specified user
     * @memberof Database
     */
    async getUserWrapper(userResolvable: UserResolvable, fields?: OptionalFields<UserObject>) {
        let user = await resolveUser(userResolvable);

        let userWrapper = this.cache.users.get(user.id);
        if (!userWrapper) {
            userWrapper = new UserWrapper(user.id, user);
            await userWrapper.createDoc({
                id: user.id,
                commandLastUsed: {}
            }, false);
            this.cache.users.set(user.id, userWrapper);
        }
        await userWrapper.load(fields);

        return userWrapper;
    }

    /**
     * cleans database from redundant data in users collection
     *
     * @memberof Database
     */
    async cleanUsers() {
        await this.mainDB.users.deleteMany({
            $or: [
                { commandLastUsed: null },
                { commandLastUsed: {} }
            ]
        }).exec(); // delete obvious redundant docs

        // redundant after usage limits update
        await this.mainDB.users.updateMany({}, {
            $unset: {
                commandCooldown: 0
            }
        });
    }
}