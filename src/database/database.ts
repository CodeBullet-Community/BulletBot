import mongoose = require('mongoose');
import {
    guildDoc,
    logDoc,
    commandsDoc,
    filtersDoc,
    globalSettingsDoc,
    staffDoc,
    commandCacheDoc,
    guildSchema,
    staffSchema,
    commandsSchema,
    filtersSchema,
    logSchema,
    commandCacheSchema,
    globalSettingsSchema,
    globalSettingsObject,
    CommandCache,
    userDoc,
    userSchema,
    megalogDoc,
    megalogSchema,
    megalogFunctions,
    megalogObject,
    caseObject,
    caseDoc,
    caseSchema,
    pActionDoc,
    pActionSchema
} from './schemas';
import { setInterval } from 'timers';
import { globalUpdateInterval, cleanInterval } from '../bot-config.json';
import { Guild, DMChannel, GroupDMChannel, TextChannel, User, Collection, Snowflake, GuildResolvable, UserResolvable } from 'discord.js';
import { Bot } from '..';
import { toNano } from '../utils/time';
import { UserWrapper } from './userWrapper';
import { GuildWrapper } from './guildWrapper';
import { resolveGuild, resolveUser } from '../utils/resolvers';

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
     * @type {{connection: mongoose.Connection;guilds: mongoose.Model<guildDoc>;staff: mongoose.Model<staffDoc>;prefix: mongoose.Model<prefixDoc>;commands: mongoose.Model<commandsDoc>;filters: mongoose.Model<filtersDoc>;logs: mongoose.Model<logDoc>;commandCache: mongoose.Model<commandCacheDoc>;}}
     * @memberof Database
     */
    mainDB: {
        connection: mongoose.Connection;
        guilds: mongoose.Model<guildDoc>;
        staff: mongoose.Model<staffDoc>;
        commands: mongoose.Model<commandsDoc>;
        filters: mongoose.Model<filtersDoc>;
        logs: mongoose.Model<logDoc>;
        commandCache: mongoose.Model<commandCacheDoc>;
        users: mongoose.Model<userDoc>;
        megalogs: mongoose.Model<megalogDoc>;
        cases: mongoose.Model<caseDoc>;
        pActions: mongoose.Model<pActionDoc>;
    };

    cache: {
        guilds: Collection<Snowflake, GuildWrapper>;
        users: Collection<Snowflake, UserWrapper>;
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
                staff: mainCon.model('staff', staffSchema, 'staff'),
                commands: mainCon.model('commands', commandsSchema, 'commands'),
                filters: mainCon.model('filters', filtersSchema, 'filters'),
                logs: mainCon.model('log', logSchema, 'logs'),
                commandCache: mainCon.model('commandCache', commandCacheSchema, 'commandCaches'),
                users: mainCon.model('user', userSchema, 'users'),
                megalogs: mainCon.model('megalogSettings', megalogSchema, 'megalogs'),
                cases: mainCon.model('cases', caseSchema, 'cases'),
                pActions: mainCon.model('pActions', pActionSchema, 'pAction')
            };

            Bot.database.cache = {
                guilds: new Collection(),
                users: new Collection()
            };

            // clean unused data from database at a certain interval
            setInterval(async () => {
                await Bot.database.cleanGuilds();
                Bot.database.cleanCommandCaches();
                Bot.database.cleanUsers();
                Bot.database.cleanMegalogs();
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
        return this.mainDB.guilds.findOne({ guild: guildID }, projection).exec();
    }

    /**
     * Returns a GuildWrapper for the specified guild. 
     * This helper function is necessary to ensure that the wrapper is ready when it's returned
     *
     * @export
     * @param {GuildResolvable} guild The guild to get the wrapper for
     * @returns GuildWrapper of the specified guild
     * @memberof Database
     */
    async getGuildWrapper(guildResolvable: GuildResolvable) {
        let guild = resolveGuild(guildResolvable);
        if (!guild) return undefined;

        let guildWrapper = this.cache.guilds.get(guild.id);
        if (guildWrapper) return guildWrapper;

        let guildDoc = await this.findGuildDoc(guild.id);
        guildWrapper = new GuildWrapper(guildDoc, guild instanceof Guild ? guild : undefined);
        this.cache.guilds.set(guild.id, guildWrapper);
        return guildWrapper
    }

    /**
     * adds guild to guild and staff collections
     *
     * @param {*} guildID id of guild that should be added
     * @returns
     * @memberof Database
     */
    async addGuild(guildID) {
        if (!(await this.findStaffDoc(guildID))) {
            var staffDoc = new this.mainDB.staff({
                guild: guildID,
                admins: {
                    roles: [],
                    users: []
                },
                mods: {
                    roles: [],
                    users: []
                },
                immune: {
                    roles: [],
                    users: []
                }
            });
            await staffDoc.save();
        }
        var guildDoc = await this.findGuildDoc(guildID)
        if (!guildDoc) {
            guildDoc = new this.mainDB.guilds({
                guild: guildID,
                logChannel: undefined,
                logs: [],
                staff: staffDoc.id,
                webhooks: {
                    youtube: []
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
        this.mainDB.guilds.deleteOne({ guild: guildID }).exec();
        this.mainDB.staff.deleteOne({ guild: guildID }).exec();
        this.mainDB.commands.deleteOne({ guild: guildID }).exec();
        this.mainDB.filters.deleteOne({ guild: guildID }).exec();
        this.mainDB.logs.deleteMany({ guild: guildID }).exec();
        this.mainDB.megalogs.deleteOne({ guild: guildID }).exec();
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
            if (!Bot.client.guilds.get(guildDoc.guild)) {
                await this.removeGuild(guildDoc.guild);
            }
        }
    }

    /**
     * finds staff doc of specified guild
     *
     * @param {string} guildID id of guild of which to get the staff doc
     * @returns
     * @memberof Database
     */
    findStaffDoc(guildID: string) {
        return this.mainDB.staff.findOne({ guild: guildID }).exec();
    }

    /**
     * adds role/user to specific rank
     * returns true if successful
     *
     * @param {string} guildID id of guild where to add the role/user
     * @param {('admins' | 'mods' | 'immune')} rank in which rank the role/user should be added
     * @param {string} [roleID] id of role (can be undefined)
     * @param {string} [userID] if of user (can be undefined)
     * @returns if addition was successful
     * @memberof Database
     */
    async addToRank(guildID: string, rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        if (!roleID && !userID) return true;
        var staffDoc = await this.findStaffDoc(guildID);

        // incase the doc wasn't created yet
        if (!staffDoc) {
            staffDoc = new this.mainDB.staff({
                guild: guildID, admins: { roles: [], users: [] },
                mods: { roles: [], users: [] },
                immune: { roles: [], users: [] }
            });
            await staffDoc.save();
        }

        // add role/user to rank
        if (roleID && !staffDoc[rank].roles.includes(roleID)) {
            staffDoc[rank].roles.push(roleID);
        } else if (userID && !staffDoc[rank].users.includes(userID)) {
            staffDoc[rank].users.push(userID);
        } else {
            return false;
        }
        staffDoc.save();
        return true;
    }

    /**
     * removes role/user from specific rank
     * returns true if successful
     *
     * @param {string} guildID id of guild where to remove the role/user
     * @param {('admins' | 'mods' | 'immune')} rank in which rank the user/role is
     * @param {string} [roleID] id of role (can be undefined)
     * @param {string} [userID] id of user (can be undefined)
     * @returns if removed was successful
     * @memberof Database
     */
    async removeFromRank(guildID: string, rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        if (!roleID && !userID) return true;
        var staffDoc = await this.findStaffDoc(guildID);
        if (!staffDoc) return;
        if (roleID && staffDoc[rank].roles.includes(roleID)) {
            staffDoc[rank].roles.splice(staffDoc[rank].roles.indexOf(roleID), 1);
        } else if (userID && staffDoc[rank].users.includes(userID)) {
            staffDoc[rank].users.splice(staffDoc[rank].users.indexOf(userID), 1);
        } else {
            return false;
        }
        staffDoc.save();
        return true;
    }

    /**
     * find command settings doc of specified guild
     *
     * @param {string} guildID id of guild of which to find the commands doc
     * @returns
     * @memberof Database
     */
    findCommandsDoc(guildID: string) {
        return this.mainDB.commands.findOne({ guild: guildID }).exec();
    }

    /**
     * gets guild specific command settings of certain command
     * if doc isn't undefined but it got deleted in the database, it will return null
     *
     * @param {string} guildID id of guild where settings should be taken
     * @param {string} command command name
     * @param {commandsDoc} [doc] existing commands doc where the settings should be extracted
     * @returns command settings
     * @memberof Database
     */
    async getCommandSettings(guildID: string, command: string, doc?: commandsDoc) {
        var commandSettings = doc;
        if (!commandSettings || commandSettings.guild != guildID)
            commandSettings = await this.findCommandsDoc(guildID);
        if (!commandSettings) return undefined;
        commandSettings = commandSettings.toObject().commands
        if (commandSettings[command]) return commandSettings[command];
        return undefined;
    }

    /**
     * sets settings of specific command in a guild
     * if doc isn't undefined but it got deleted in the database, it won't change anything
     *
     * @param {string} guildID id of guild where settings should be set
     * @param {string} command command name
     * @param {*} settings settings that should be set
     * @param {commandsDoc} [doc] existing commands doc where the settings should inserted
     * @returns whole command doc
     * @memberof Database
     */
    async setCommandSettings(guildID: string, command: string, settings: any, doc?: commandsDoc) {
        if (!doc || doc.guild != guildID) {
            doc = await this.findCommandsDoc(guildID);
        }
        if (!doc) {
            doc = new this.mainDB.commands({
                guild: guildID,
                commands: {}
            });
        }
        doc.commands[command] = settings;
        doc.markModified('commands.' + command);
        return await doc.save();
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
     * @param {filtersDoc} [doc] existing filters doc where the settings should be extracted
     * @returns filter settings
     * @memberof Database
     */
    async getFilterSettings(guildID: string, filter: string, doc?: filtersDoc) {
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
     * @param {filtersDoc} [doc] existing filters doc where the settings should be inserted
     * @returns whole filter doc
     * @memberof Database
     */
    async setFilterSettings(guildID: string, filter: string, settings: any, doc?: filtersDoc) {
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
     * @returns
     * @memberof Database
     */
    findCommandCacheDoc(channelID: string, userID: string, timestamp: Number = Date.now()) {
        return this.mainDB.commandCache.findOne({ channel: channelID, user: userID, delete: { $gt: timestamp } }).exec();
    }

    /**
     * searches for commandCache and will wrap in a CommandCache class. If cacheTime and command is specified it will create one if not found. 
     * This WON'T update the delete property of a found doc.
     *
     * @param {(DMChannel | GroupDMChannel | TextChannel)} channel channel for commandCache
     * @param {User} user user for commandCache
     * @param {string} [command] command name for new commandCache
     * @param {number} [cacheTime] cache time for new commandCache
     * @param {*} [cache] optional cache to set in new commandCache
     * @returns commandCache wrapped in a CommandCache class
     * @memberof Database
     */
    async getCommandCache(channel: DMChannel | GroupDMChannel | TextChannel, user: User, command?: string, cacheTime?: number, cache?: any) {
        let commandCacheDoc = await this.findCommandCacheDoc(channel.id, user.id);

        if (!commandCacheDoc) {
            if (cacheTime && command)
                return new CommandCache(undefined, channel, user, command, cacheTime, cache);
            return undefined;
        }
        return new CommandCache(commandCacheDoc);
    }

    /**
     * deletes all old command caches
     *
     * @returns
     * @memberof Database
     */
    cleanCommandCaches() {
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
     * will search for a user doc and wrap it in a UserWrapper. 
     * If create is true and it didn't find a user doc, it will create a new one.
     *
     * @param {User} user user for which to find/create a wrapper/doc
     * @param {boolean} [create=false] if it should create a new doc if there isn't already one. (default false)
     * @returns user doc wrapped in a UserWrapper
     * @memberof Database
     */
    async getUser(user: User, create: boolean = false) {
        var userDoc = await this.findUserDoc(user.id);
        if (userDoc) {
            return new UserWrapper(userDoc, user);
        } else if (create)
            return new UserWrapper(undefined, user);
    }

    /**
     * Gets a user wrapper for a given user and caches it
     *
     * @param {UserResolvable} userResolvable User for which to get a wrapper
     * @param {boolean} [create] If a userDoc should be created if it wasn't found (won't be saved to the database)
     * @returns The userWrapper of the given user
     * @memberof Database
     */
    async getUserWrapper(userResolvable: UserResolvable, create?: boolean) {
        let user = await resolveUser(userResolvable);

        let userWrapper = this.cache.users.get(user.id);
        if (userWrapper) return userWrapper;

        let userDoc = await Bot.database.findUserDoc(user.id);
        if (!userDoc && create)
            userDoc = new Bot.database.mainDB.users({ user: user.id });
        if (!userDoc) return undefined;

        userWrapper = new UserWrapper(userDoc, user);
        this.cache.users.set(user.id, userWrapper);
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

    /**
     * makes query to find megalog doc of a guild
     *
     * @param {string} guildID guild id
     * @returns
     * @memberof Database
     */
    findMegalogDoc(guildID: string) {
        return this.mainDB.megalogs.findOne({ guild: guildID }).exec();
    }

    /**
     * will try to find the megalog doc of a guild and if non was found, it will create one
     *
     * @param {string} guildID guild id
     * @returns
     * @memberof Database
     */
    async getMegalogDoc(guildID: string) {
        let megalogDoc = await this.findMegalogDoc(guildID);
        if (!megalogDoc) {
            megalogDoc = new this.mainDB.megalogs({
                guild: guildID
            });
            await megalogDoc.save();
        }
        return megalogDoc;
    }

    /**
     * cleans database of unused megalog docs and functions with nonexsiting channels
     *
     * @memberof Database
     */
    async cleanMegalogs() {
        // delete functions set to undefined
        let deleteQuery = {};
        for (const func of megalogFunctions.all) {
            deleteQuery[func] = { $exists: false };
        }
        await this.mainDB.megalogs.deleteMany(deleteQuery).exec();

        let megalogDocs = await this.mainDB.megalogs.find();
        for (const megalogDoc of megalogDocs) {
            let modified = false;
            let megalogObject: megalogObject = megalogDoc.toObject();
            let guild = Bot.client.guilds.get(megalogObject.guild);
            if (!guild) { // if guild was deleted
                megalogDoc.remove();
                continue;
            }
            for (const func of megalogFunctions.all) { // check if the channels for the functions still exist
                if (megalogObject[func] && !guild.channels.get(megalogObject[func])) {
                    megalogDoc[func] = undefined;
                    modified = true;
                }
            }
            if (modified) megalogDoc.save();
        }
    }
}