import { PresenceData } from 'discord.js';
import mongoose = require('mongoose');

import { Bot } from '..';
import { globalUpdateInterval } from '../bot-config.json';
import { CommandResolvable } from '../commands';
import { resolveCommand } from '../utils/resolvers';
import { GlobalSettingsObject, GlobalSettingsDoc, globalSettingsSchema } from './schemas/settings/settings';
import { UsageLimits, CommandUsageLimits } from './schemas/global';

/**
 * Connects to the settings database and caches the global settings.
 *
 * @export
 * @class Settings
 * @implements {globalSettingsObject}
 */
export class Settings implements GlobalSettingsObject {
    prefix: string;
    presence: PresenceData;
    embedColors: { default: number; help: number; neutral: number; negative: number; warn: number; positive: number; };
    botMasters: string[];
    commands: { [key: string]: { [key: string]: any; }; };
    filters: { [key: string]: { [key: string]: any; }; };
    usageLimits?: UsageLimits;
    connection: mongoose.Connection;
    collection: mongoose.Model<GlobalSettingsDoc>;

    /**
     * Creates an instance of Settings and a connection to the settings database. 
     * It automatically synchronizes the cache with the database.
     * 
     * @param {{ url: string, suffix: string }} clusterInfo cluster info from bot config
     * @memberof Settings
     */
    constructor(clusterInfo: { url: string, suffix: string }) {
        this.connection = mongoose.createConnection(`${clusterInfo.url}/settings${clusterInfo.suffix}`, { useNewUrlParser: true });
        this.connection.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        this.connection.once('open', async () => {
            console.log('settings connected to /settings database');

            this.collection = this.connection.model('globalSettings', globalSettingsSchema, 'settings');
            this.sync();

            // if the bot is connected to a replica set
            if (clusterInfo.suffix.includes('replicaSet')) {
                // add a listener
                this.collection.watch().on('change', data => this.processDoc(data.fullDocument));
                console.info(`added listener to global settings collection`);
            } else {
                // update global settings cache at a certain interval
                setInterval(this.sync, globalUpdateInterval);
                console.info(`updating global settings cache every ${globalUpdateInterval}ms`);
            }
        });
    }

    /**
     * Synchronizes the cache with the database
     *
     * @memberof Settings
     */
    async sync() {
        let doc = await Bot.settings.collection.findOne().exec();
        if (!doc)
            throw new Error('settings document not found');
        Bot.settings.processDoc(doc);
    }

    /**
     * Processes the retrieved settings document and caches it.
     *
     * @private
     * @param {GlobalSettingsDoc} doc
     * @memberof Settings
     */
    processDoc(doc: GlobalSettingsDoc) {
        let settingsObj = doc.toObject({minimize: false});
        for (const key in settingsObj)
            this[key] = settingsObj[key];

        if (!Bot.client.user) return;
        if (this.presence && (this.presence.status || this.presence.game || this.presence.afk)) {
            Bot.client.user.setPresence(this.presence);
        } else {
            Bot.client.user.setActivity(undefined);
            Bot.client.user.setStatus('online');
        }
    }

    /**
     * Always returns an object even if no usage limits were set.
     *
     * @returns
     * @memberof Settings
     */
    getUsageLimits() {
        return this.usageLimits || {};
    }

    /**
     * Gets a property at the specified path
     *
     * @private
     * @param {*} object object to trace
     * @param {string} path path of requested property
     * @returns value of property
     * @memberof Settings
     */
    private tracePath(object, path: string) {
        let current = object;
        for (const property of path.split('.')) {
            if (current === undefined) return undefined;
            current = current[property];
        }
        return current;
    }

    /**
     * Merges the command usage limits in the code with those specified in the settings
     *
     * @param {CommandResolvable} commandResolvable Of what command to get usage limits
     * @returns {CommandUsageLimits}
     * @memberof Settings
     */
    getCommandUsageLimits(commandResolvable: CommandResolvable): CommandUsageLimits {
        let command = resolveCommand(commandResolvable);
        let usageLimits = this.tracePath(this.usageLimits, `commands.${command.name}`) || {};
        return Bot.commands.getCommandUsageLimits(command, usageLimits);
    }

    /**
     * returns array of bot master ids
     *
     * @returns
     * @memberof Database
     */
    getBotMasters(): string[] {
        if (!Bot.settings) return [];
        return Bot.settings.botMasters;
    }

}