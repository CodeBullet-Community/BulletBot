import mongoose = require('mongoose');
import { guildDoc, logDoc, commandsDoc, filtersDoc, globalSettingsDoc, staffDoc, prefixDoc, commandCacheDoc, guildSchema, staffSchema, prefixSchema, commandsSchema, filtersSchema, logSchema, commandCacheSchema, globalSettingsSchema, globalSettingsObject } from './schemas';
import { setInterval } from 'timers';
import { globalUpdateInterval } from '../bot-config.json';
import { Guild, Role } from 'discord.js';

/**
 * Manages all connections to the main database.
 *
 * @export
 * @class Database
 */
export class Database {
    mainDB: {
        connection: mongoose.Connection;
        guilds: mongoose.Model<guildDoc>;
        staff: mongoose.Model<staffDoc>;
        prefix: mongoose.Model<prefixDoc>;
        commands: mongoose.Model<commandsDoc>;
        filters: mongoose.Model<filtersDoc>;
        logs: mongoose.Model<logDoc>;
        commandCache: mongoose.Model<commandCacheDoc>;
    };
    settingsDB: {
        connection: mongoose.Connection;
        settings: mongoose.Model<globalSettingsDoc>;
        cache: globalSettingsObject;
    };

    /**
     * Creates an instance of Database.
     * 
     * @param {string} URI URL to cluster with login credentials when needed
     * @param {string} authDB authentication database name
     * @memberof Database
     */
    constructor(URI: string, authDB: string) {
        var mainCon = mongoose.createConnection(URI + '/main' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        mainCon.on('error', console.error.bind(console, 'connection error:'));
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
            commandCache: mainCon.model('commandCache', commandCacheSchema, 'commandCaches')
        }

        var settingsCon = mongoose.createConnection(URI + '/settings' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true })
        settingsCon.on('error', console.error.bind(console, 'connection error:'));
        settingsCon.once('open', function () {
            console.log('connected to /settings database')
        });

        this.settingsDB = {
            connection: settingsCon,
            settings: settingsCon.model('globalSettings', globalSettingsSchema, 'settings'),
            cache: undefined
        }
        this.updateGLobalSettings(this.settingsDB);
        this.updateCacheAtInterval(globalUpdateInterval);
    }

    /**
     * pings cluster and returns the ping latency
     *
     * @returns
     * @memberof Database
     */
    async ping() {
        var ping = new Date().getTime();
        await this.mainDB.connection.db.command({ ping: 1 });
        return new Date().getTime() - ping;
    }

    /**
     * updates cache of global settings
     *
     * @returns
     * @memberof Database
     */
    async updateGLobalSettings(settingsDB: {
        connection: mongoose.Connection;
        settings: mongoose.Model<globalSettingsDoc>;
        cache: globalSettingsObject;
    }) {
        var settingsDoc = await settingsDB.settings.findOne().exec();
        if (!settingsDoc) {
            console.warn('global settings doc not found');
            return;
        }
        settingsDB.cache = settingsDoc.toObject();
    }

    /**
     * calls updateGLobalSettings() at specified interval
     *
     * @param {number} ms
     * @memberof Database
     */
    private updateCacheAtInterval(ms: number) {
        setInterval(() => {
            this.updateGLobalSettings(this.settingsDB);
        }, ms);
        console.info(`updating global cache every ${ms}ms`);
    }

    /**
     * sets prefix of specific guild
     * resets it, when prefix is undefined
     *
     * @param {string} guildID
     * @param {string} [prefix]
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
     * @param {string} name
     * @returns
     * @memberof Database
     */
    getGlobalCommandSettings(name: string) {
        if (!this.settingsDB.cache || !this.settingsDB.cache.commands[name])
            return undefined;
        return this.settingsDB.cache.commands[name];
    }

    /**
     * return global filter settings of specific filter
     *
     * @param {string} name
     * @returns
     * @memberof Database
     */
    getGlobalFilterSettings(name: string) {
        if (!this.settingsDB.cache || !this.settingsDB.cache.filters[name])
            return undefined;
        return this.settingsDB.cache.filters[name];
    }

    /**
     * return guild search query
     *
     * @param {string} guildID
     * @returns
     * @memberof Database
     */
    findGuildDoc(guildID: string) {
        return this.mainDB.guilds.findOne({ guild: guildID }).exec();
    }

    /**
     * adds guild to guild and staff collections
     *
     * @param {*} guildID
     * @returns
     * @memberof Database
     */
    async addGuild(guildID) {
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
        var guildDoc = new this.mainDB.guilds({
            guild: guildID,
            logChannel: undefined,
            logs: [],
            staff: staffDoc.id,
            webhooks: {
                youtube: []
            }
        });
        return await guildDoc.save();
    }

    /**
     * removes all docs related to specified guild in database
     *
     * @param {string} guildID
     * @memberof Database
     */
    async removeGuild(guildID: string) {
        // TODO: webhooks
        var guildDoc = await this.findGuildDoc(guildID);
        var logs: string[];
        var webhooks: { [key: string]: string[] };
        if (guildDoc) {
            logs = guildDoc.toObject().logs;
            webhooks = guildDoc.toObject().webhooks;
            guildDoc.remove();
        }

        var staffDoc = await this.mainDB.staff.findOne({ guild: guildID }).exec();
        if (staffDoc) staffDoc.remove();

        var prefixDoc = await this.mainDB.prefix.findOne({ guild: guildID }).exec();
        if (prefixDoc) prefixDoc.remove();

        var commandsDoc = await this.findCommandsDoc(guildID);
        if (commandsDoc) commandsDoc.remove();

        var filtersDoc = await this.findFiltersDoc(guildID);
        if (filtersDoc) filtersDoc.remove();

        if (logs && !logs.length) {
            for (const log of logs) {
                var logDoc = this.mainDB.logs.findById(log);
                if (logDoc) logDoc.remove();
            }
        }
    }

    /**
     * finds staff doc of specified guild
     *
     * @param {string} guildID
     * @returns
     * @memberof Database
     */
    findStaffDoc(guildID: string) {
        return this.mainDB.staff.findOne({ guild: guildID }).exec();
    }

    /**
     * adds role/user to specific rank
     * returns true if successfull
     *
     * @param {string} guildID
     * @param {('admins' | 'mods' | 'immune')} rank
     * @param {string} [roleID]
     * @param {string} [userID]
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
     * returns true if successfull
     *
     * @param {string} guildID
     * @param {('admins' | 'mods' | 'immune')} rank
     * @param {string} [roleID]
     * @param {string} [userID]
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
     * @param {string} guildID
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
     * @param {string} guildID
     * @param {string} command
     * @param {commandsDoc} [doc] 
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
     * @param {string} guildID
     * @param {string} command
     * @param {*} settings
     * @param {commandsDoc} [doc]
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
     * @param {string} guildID
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
     * @param {string} guildID
     * @param {string} filter
     * @param {filtersDoc} [doc] 
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
     * @param {string} guildID
     * @param {string} filter
     * @param {*} settings settings of command
     * @param {filtersDoc} [doc]
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

}