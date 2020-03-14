import { GlobalSettingsObject } from "../schemas/settings/settings";
import { Wrapper } from "./wrapper";
import { UsageLimits, CommandUsageLimits } from "../schemas/global";
import { PresenceData, Snowflake, UserResolvable } from "discord.js";
import { CommandName, CommandResolvable } from "../../commands";
import { Bot } from "../..";
import { keys } from "ts-transformer-keys";
import { map } from "rxjs/operators";
import { resolveCommand, resolveUserID } from "../../utils/resolvers";
import _ from "lodash";

/**
 * Wrapper for the GlobalSettingsObject so everything can easily be access through one object
 *
 * @export
 * @class SettingsWrapper
 * @extends {Wrapper<GlobalSettingsObject>}
 * @implements {GlobalSettingsObject}
 */
export class SettingsWrapper extends Wrapper<GlobalSettingsObject> implements GlobalSettingsObject {
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

    /**
     * Creates an instance of SettingsWrapper.
     * 
     * @memberof SettingsWrapper
     */
    constructor() {
        super(Bot.database.settingsDB.settings, {}, [], keys<GlobalSettingsObject>());

        this.subToField('presence').pipe(
            map(data => data.presence)
        ).subscribe(this.setBotStatus);
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
            await Bot.client.user.setActivity(undefined);
            await Bot.client.user.setStatus('online');
            return;
        }
        await Bot.client.user.setPresence(this.presence);
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
        let command = resolveCommand(commandResolvable);
        let usageLimits = _.get(this.usageLimits, `commands.${command.name}`) || {};
        return Bot.commands.getCommandUsageLimits(command, usageLimits);
    }

    /**
     * Returns an array of bot masters
     *
     * @returns
     * @memberof Database
     */
    async getBotMasters() {
        await this.load('botMasters');
        return Bot.settings.botMasters;
    }


    /**
     * Checks if User is a bot master
     *
     * @param {UserResolvable} user
     * @returns
     * @memberof SettingsWrapper
     */
    async isBotMasters(user: UserResolvable) {
        let userId = resolveUserID(user);
        return (await this.getBotMasters()).includes(userId);
    }

}