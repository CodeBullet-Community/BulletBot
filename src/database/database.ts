import mongoose = require('mongoose');
import { guildDoc, logDoc, commandsDoc, filtersDoc, globalSettingsDoc, staffDoc, prefixDoc, commandCacheDoc, guildSchema, staffSchema, prefixSchema, commandsSchema, filtersSchema, logSchema, commandCacheSchema, globalSettingsSchema, globalSettingsObject, CommandCache, userDoc, userSchema, UserWrapper, megalogDoc, megalogSchema, megalogFunctions, megalogObject } from './schemas';
import { setInterval } from 'timers';
import { globalUpdateInterval, cleanInterval } from '../bot-config.json';
import { Guild, DMChannel, GroupDMChannel, TextChannel, User } from 'discord.js';
import { Bot } from '..';
import { toNano } from '../utils/time';

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
        prefix: mongoose.Model<prefixDoc>;
        commands: mongoose.Model<commandsDoc>;
        filters: mongoose.Model<filtersDoc>;
        logs: mongoose.Model<logDoc>;
        commandCache: mongoose.Model<commandCacheDoc>;
        users: mongoose.Model<userDoc>;
        megalogs: mongoose.Model<megalogDoc>;
    };
    /**
     * represents the settings database with the settings collection and the connection. There is also a cache of the settings doc.
     *
     * @type {{connection: mongoose.Connection;settings: mongoose.Model<globalSettingsDoc>;cache: globalSettingsObject;}}
     * @memberof Database
     */
    settingsDB: {
        connection: mongoose.Connection;
        settings: mongoose.Model<globalSettingsDoc>;
        cache: globalSettingsObject;
    };

    /**
     * Creates an instance of Database and connections to the main and settings database.
     * 
     * @param {string} URI URL to cluster with login credentials when needed
     * @param {string} authDB authentication database name
     * @memberof Database
     */
    constructor(URI: string, authDB: string) {
        var mainCon = mongoose.createConnection(URI + '/main' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        mainCon.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        mainCon.once('open', function () {
            console.log('connected to /main database');
        });

        this.mainDB = {
            connection: mainCon,
            guilds: mainCon.model('guild', guildSchema, 'guilds'),
            staff: mainCon.model('staff', staffSchema, 'staff'),
            prefix: mainCon.model('prefix', prefixSchema, 'prefix'),
            commands: mainCon.model('commands', commandsSchema, 'commands'),
            filters: mainCon.model('filters', filtersSchema, 'filters'),
            logs: mainCon.model('log', logSchema, 'logs'),
            commandCache: mainCon.model('commandCache', commandCacheSchema, 'commandCaches'),
            users: mainCon.model('user', userSchema, 'users'),
            megalogs: mainCon.model('megalogSettings', megalogSchema, 'megalogs'),
        }

        var settingsCon = mongoose.createConnection(URI + '/settings' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true })
        settingsCon.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        settingsCon.once('open', function () {
            console.log('connected to /settings database')
        });

        this.settingsDB = {
            connection: settingsCon,
            settings: settingsCon.model('globalSettings', globalSettingsSchema, 'settings'),
            cache: undefined
        }
        this.updateGlobalSettings(this.settingsDB);

        setInterval(() => this.updateGlobalSettings(this.settingsDB), globalUpdateInterval);
        console.info(`updating global cache every ${globalUpdateInterval}ms`);
        setInterval(() => {
            this.cleanCommandCaches();
            this.cleanUsers();
            this.cleanMegalogs();
            //console.log('cleaned database');
        }, cleanInterval);
        console.info(`cleaning command caches every ${cleanInterval}ms`);
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
     * updates cache of global settings
     *
     * @param {{connection: mongoose.Connection;settings: mongoose.Model<globalSettingsDoc>;cache: globalSettingsObject;}} settingsDB settings property of class, so this function can also access it in a interval
     * @returns
     * @memberof Database
     */
    async updateGlobalSettings(settingsDB: {
        connection: mongoose.Connection;
        settings: mongoose.Model<globalSettingsDoc>;
        cache: globalSettingsObject;
    }) {
        var settingsDoc = await settingsDB.settings.findOne().exec();
        if (!settingsDoc) {
            console.warn('global settings doc not found');
            return;
        }

        var settingsObject: globalSettingsObject = settingsDoc.toObject()
        if (settingsDB.cache && (settingsObject.presence != settingsDB.cache.presence || !settingsObject.presence)) {
            if (settingsObject.presence && (settingsObject.presence.status || settingsObject.presence.game || settingsObject.presence.afk)) {
                Bot.client.user.setPresence(settingsObject.presence);
            } else {
                Bot.client.user.setActivity(undefined);
                Bot.client.user.setStatus('online');
            }
        }

        settingsDB.cache = settingsObject;
    }

    /**
     * sets prefix of specific guild
     * resets it, when prefix is undefined
     *
     * @param {string} guildID id of guild where to set the prefix
     * @param {string} [prefix] the custom prefix. If it's undefined the prefix will be reset
     * @returns
     * @memberof Database
     */
    async setPrefix(guildID: string, prefix?: string) {
        var prefixDoc: prefixDoc;
        if (prefix) {
            prefixDoc = await this.mainDB.prefix.findOne({ guild: guildID }).exec();
            if (prefixDoc) return await prefixDoc.remove();
        }
        prefixDoc = new this.mainDB.prefix({
            guild: guildID,
            prefix: prefix
        });
        return await prefixDoc.save();
    }

    /**
     * returns prefix of specific guild
     * returns default prefix if there isn't a custom one defined
     *
     * @param {string} guildID
     * @returns
     * @memberof Database
     */
    /**
     * returns prefix of specific guild
     * returns default prefix if there isn't a custom one defined
     *
     * @param {Guild} [guild] guild of which to get the prefix
     * @param {string} [guildID] guild id if you only have the id
     * @returns {Promise<string>} the prefix
     * @memberof Database
     */
    async getPrefix(guild?: Guild, guildID?: string): Promise<string> {
        if (!guildID && guild) guildID = guild.id;
        if (guildID) {
            var prefixDoc = await this.mainDB.prefix.findOne({ guild: guildID }).exec();
            if (prefixDoc) return prefixDoc.toObject().prefix;
            if (!this.settingsDB.cache) return '!?';
        }
        return this.settingsDB.cache.prefix;
    }

    /**
     * returns array of bot master ids
     *
     * @returns
     * @memberof Database
     */
    getBotMasters() {
        if (!this.settingsDB.cache) return [];
        return this.settingsDB.cache.botMasters;
    }

    /**
     * return global command settings of specific command
     *
     * @param {string} command command name
     * @returns
     * @memberof Database
     */
    getGlobalCommandSettings(command: string) {
        if (!this.settingsDB.cache || !this.settingsDB.cache.commands[command])
            return undefined;
        return this.settingsDB.cache.commands[command];
    }

    /**
     * return global filter settings of specific filter
     *
     * @param {string} filter filter name
     * @returns
     * @memberof Database
     */
    getGlobalFilterSettings(filter: string) {
        if (!this.settingsDB.cache || !this.settingsDB.cache.filters[filter])
            return undefined;
        return this.settingsDB.cache.filters[filter];
    }

    /**
     * return guild search query
     *
     * @param {string} guildID id of guild of which t find the doc
     * @returns
     * @memberof Database
     */
    findGuildDoc(guildID: string) {
        return this.mainDB.guilds.findOne({ guild: guildID }).exec();
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
        for (const webhookDoc of await Bot.youtube.webhooks.find({ guild: guildID })) {
            Bot.youtube.deleteWebhook(guildID, webhookDoc.toObject().channel, webhookDoc.toObject().feed);
        }
        this.mainDB.guilds.deleteOne({ guild: guildID }).exec();
        this.mainDB.staff.deleteOne({ guild: guildID }).exec();
        this.mainDB.prefix.deleteOne({ guild: guildID }).exec();
        this.mainDB.commands.deleteOne({ guild: guildID }).exec();
        this.mainDB.filters.deleteOne({ guild: guildID }).exec();
        this.mainDB.logs.deleteMany({ guild: guildID }).exec();
        this.mainDB.megalogs.deleteOne({ guild: guildID }).exec();
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
     * @returns
     * @memberof Database
     */
    async addToRank(guildID: string, rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        if (!roleID && !userID) return true;
        var staffDoc = await this.findStaffDoc(guildID);
        if (!staffDoc) {
            staffDoc = new this.mainDB.staff({
                guild: guildID, admins: { roles: [], users: [] },
                mods: { roles: [], users: [] },
                immune: { roles: [], users: [] }
            });
            await staffDoc.save();
        }
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
     * @returns
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
     * cleans database from redundant data in users collection
     *
     * @memberof Database
     */
    async cleanUsers() {
        await this.mainDB.users.deleteMany({
            $or: [
                { commandCooldown: null },
                { commandCooldown: {} }
            ]
        }).exec(); // delete obvious redundant docs

        let userDocs = await this.mainDB.users.find().exec();
        let now = Date.now();
        for (const userDoc of userDocs) {
            let useless = true; // if doc is useless
            let changed = false; // if some data was deleted
            for (const scopes in userDoc.commandCooldown) {
                for (const commands in userDoc.commandCooldown[scopes]) {
                    if (userDoc.commandCooldown[scopes][commands] < now) {
                        delete userDoc.commandCooldown[scopes][commands];
                        changed = true;
                    } else {
                        useless = false;
                    }
                }
            }
            if (useless || !await Bot.client.fetchUser(userDoc.toObject().user)) { // if doc is useless or the bot no longer has a relationship with the user
                userDoc.remove();
                continue;
            }
            if (changed) {
                userDoc.markModified('commandCooldown');
                userDoc.save();
            }
        }

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
            if (!guild) {
                megalogDoc.remove();
                continue;
            }
            for (const func of megalogFunctions.all) {
                if (megalogObject[func] && !guild.channels.get(megalogObject[func])) {
                    megalogDoc[func] = undefined;
                    modified = true;
                }
            }
            if (modified) megalogDoc.save();
        }
    }
}