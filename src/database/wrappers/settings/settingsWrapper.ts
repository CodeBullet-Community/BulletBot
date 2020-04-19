import { PresenceData, Snowflake, UserResolvable } from 'discord.js';
import _ from 'lodash';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { Bot } from '../../..';
import { CommandName, CommandResolvable } from '../../../commands';
import { CommandUsageLimits, UsageLimits } from '../../schemas/global';
import { GlobalSettingsDoc, GlobalSettingsObject } from '../../schemas/settings/settings';
import { DocWrapper } from '../docWrapper';

/**
 * Wrapper for the GlobalSettingsObject so everything can easily be access through one object
 *
 * @export
 * @class SettingsWrapper
 * @extends {DocWrapper<GlobalSettingsObject>}
 * @implements {GlobalSettingsObject}
 */
export class SettingsWrapper extends DocWrapper<GlobalSettingsObject> implements GlobalSettingsObject {
    readonly prefix: string;
    readonly presence: PresenceData;
    readonly embedColors: {
        default: number;
        help: number;
        neutral: number;
        negative: number;
        warn: number;
        positive: number;
    };
    readonly botMasters: Snowflake[];
    readonly commands: {
        [Command in CommandName]: {
            [key: string]: any;
        };
    };
    readonly filters: {
        [filter: string]: {
            [key: string]: any;
        }
    };
    readonly usageLimits?: UsageLimits;
    private bot: Bot

    /**
     * Creates an instance of SettingsWrapper.
     * 
     * @memberof SettingsWrapper
     */
    constructor(model: Model<GlobalSettingsDoc>, bot: Bot) {
        super(model, {}, {}, keys<GlobalSettingsObject>());

        this.bot = bot;

        this.subToMappedProperty('presence').subscribe(this.setBotStatus);
    }

    /**
     * Sets the status of the bot
     *
     * @private
     * @param {PresenceData} presence Presence to which to set it to
     * @returns
     * @memberof SettingsWrapper
     */
    private async setBotStatus(presence: PresenceData) {
        if (!presence || presence == {}) {
            await this.bot.client.user.setActivity(undefined);
            await this.bot.client.user.setStatus('online');
            return;
        }
        await this.bot.client.user.setPresence(this.presence);
    }

    /**
     * Always returns an object even if no usage limits were set.
     *
     * @returns
     * @memberof Settings
     */
    async getUsageLimits() {
        await this.load('usageLimits');
        return this.usageLimits || {};
    }

    /**
     * Merges the command usage limits in the code with those specified in the settings
     *
     * @param {CommandResolvable} commandResolvable Of what command to get usage limits
     * @returns {CommandUsageLimits}
     * @memberof Settings
     */
    async getCommandUsageLimits(commandResolvable: CommandResolvable) {
        await this.load('usageLimits');
        let command = this.bot.commands.resolve(commandResolvable);
        let usageLimits = _.get(this.usageLimits, `commands.${command.name}`) || {};
        return this.bot.commands.getCommandUsageLimits(command, usageLimits);
    }

    /**
     * Returns an array of bot masters
     *
     * @returns
     * @memberof Database
     */
    async getBotMasters() {
        await this.load('botMasters');
        return this.botMasters;
    }


    /**
     * Checks if User is a bot master
     *
     * @param {UserResolvable} user
     * @returns
     * @memberof SettingsWrapper
     */
    async isBotMasters(user: UserResolvable) {
        let userID = this.bot.client.users.resolveID(user);
        return (await this.getBotMasters()).includes(userID);
    }

}