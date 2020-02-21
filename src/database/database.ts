import mongoose = require('mongoose');
import {
    GuildDoc,
    LogDoc,
    FiltersDoc,
    CommandCacheDoc,
    guildSchema,
    filtersSchema,
    logSchema,
    commandCacheSchema,
    UserDoc,
    userSchema,
    CaseDoc,
    caseSchema,
    PActionDoc,
    pActionSchema,
    GuildObject,
    UserObject
} from './schemas';
import { setInterval } from 'timers';
import { cleanInterval } from '../bot-config.json';
import { DMChannel, GroupDMChannel, TextChannel, Collection, Snowflake, GuildResolvable, UserResolvable, ChannelResolvable } from 'discord.js';
import { Bot } from '..';
import { toNano } from '../utils/time';
import { UserWrapper } from './wrappers/userWrapper';
import { GuildWrapper } from './wrappers/guildWrapper';
import { resolveGuild, resolveUser, resolveUserID, resolveChannelID, resolveChannel, resolveCommand } from '../utils/resolvers';
import { CommandResolvable } from '../commands';
import { CommandCache } from './/wrappers/commandCache';

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
        commandCaches: Collection<String, CommandCache>; // key is `${channel.id} {user.id}`
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
     * @param {(keyof GuildObject | (keyof GuildObject)[])} [fields] Only those fields should be loaded (Can also be a single value)
     * @returns GuildWrapper of the specified guild
     * @memberof Database
     */
    async getGuildWrapper(guildResolvable: GuildResolvable, fields?: keyof GuildObject | (keyof GuildObject)[]) {
        let guild = resolveGuild(guildResolvable);
        if (!guild) return undefined;

        let guildWrapper = this.cache.guilds.get(guild.id)
        if (!guildWrapper) {
            guildWrapper = new GuildWrapper(guild.id, guild);
            this.cache.guilds.set(guild.id, guildWrapper);
        }
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
     * @param {Number} [timestamp=Date.now()] Timestamp of when the command cache was valid (Default: Date.now())
     * @returns
     * @memberof Database
     */
    findCommandCacheDoc(channelID: string, userID: string, timestamp: Number = Date.now()) {
        return this.mainDB.commandCache.findOne({ channel: channelID, user: userID, delete: { $gt: timestamp } }).exec();
    }

    /**
     * Returns key associated with the command cache used for internal caching
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
     * Checks if the channel is one used by command caches
     *
     * @private
     * @param {ChannelResolvable} channel Channel to check
     * @returns Channel object if it's valid
     * @memberof Database
     */
    private validateCommandCacheChannel(channel: ChannelResolvable) {
        let channelObj = resolveChannel(channel);
        if (!(channelObj instanceof DMChannel ||
            channelObj instanceof GroupDMChannel ||
            channelObj instanceof TextChannel)) throw new Error('Command cache can only be created for DMChannel, GroupDMChannel or TextChannel');
        return channelObj;
    }

    /**
     * Creates a new commandCache in the database and returns a CommandCache object
     *
     * @param {ChannelResolvable} channel Channel in which the command cache is valid
     * @param {UserResolvable} user User associated with the command cache
     * @param {CommandResolvable} command Command that created the command cache
     * @param {number} deleteTimestamp When the command cache should be deleted
     * @param {*} [cache={}] Optional cache
     * @returns
     * @memberof Database
     */
    async createCommandCache(channel: ChannelResolvable, user: UserResolvable, command: CommandResolvable, deleteTimestamp: number, cache = {}) {
        let channelObj = this.validateCommandCacheChannel(channel);
        let userObj = await resolveUser(user);
        let commandName = resolveCommand(command).name;

        let doc = await new Bot.database.mainDB.commandCache({
            channel: channelObj.id,
            user: userObj,
            command: commandName,
            cache: cache,
            delete: deleteTimestamp
        }).save();
        let commandCache = new CommandCache(doc, userObj, channelObj);
        let cacheKey = this.getCommandCacheKey(channelObj.id, userObj.id);
        this.cache.commandCaches.set(cacheKey, commandCache);
        return commandCache;
    }

    /**
     * Searches cache and database for command cache and returns it wrapped in a CommandCache class
     *
     * @param {ChannelResolvable} channel channel for commandCache
     * @param {UserResolvable} user user for commandCache
     * @returns commandCache wrapped in a CommandCache class
     * @memberof Database
     */
    async getCommandCache(channel: ChannelResolvable, user: UserResolvable) {
        let channelObj = this.validateCommandCacheChannel(channel);
        let userObj = await resolveUser(user);
        let cacheKey = this.getCommandCacheKey(channelObj, userObj);

        let commandCache = this.cache.commandCaches.get(cacheKey);
        if (commandCache && commandCache.delete > Date.now()) return commandCache;

        let commandCacheDoc = await this.findCommandCacheDoc(channelObj.id, userObj.id);
        if (!commandCacheDoc) return undefined;
        commandCache = new CommandCache(commandCacheDoc, userObj, channelObj);
        this.cache.commandCaches.set(cacheKey, commandCache);
        return commandCache;
    }

    /**
     * deletes all old command caches
     *
     * @returns
     * @memberof Database
     */
    cleanCommandCaches() {
        for (const cache of this.cache.commandCaches) {
            if (cache[1].delete > Date.now()) continue;
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
     * @param {(keyof UserObject | (keyof UserObject)[])} [fields] Only those fields should be loaded (Can also be a single value)
     * @returns UserWrapper for the specified user
     * @memberof Database
     */
    async getUserWrapper(userResolvable: UserResolvable, fields?: keyof UserObject | (keyof UserObject)[]) {
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