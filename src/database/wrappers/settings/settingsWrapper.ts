import { Client, PresenceData, Snowflake, UserResolvable } from 'discord.js';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';
import { container } from 'tsyringe';

import { CommandName } from '../../../commands/command';
import { GlobalSettingsDoc, GlobalSettingsObject } from '../../schemas/settings/settings';
import { DocWrapper } from '../docWrapper';
import { UsageLimitsWrapper } from '../shared/usageLimitsWrapper';

/**
 * Wrapper for the GlobalSettingsObject so everything can easily be access through one object
 *
 * @export
 * @class SettingsWrapper
 * @extends {DocWrapper<GlobalSettingsObject>}
 * @implements {GlobalSettingsObject}
 */
export class SettingsWrapper extends DocWrapper<GlobalSettingsObject> implements GlobalSettingsObject {
    readonly botToken: string;
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
    private _usageLimits: UsageLimitsWrapper<this>;
    readonly usageLimits: UsageLimitsWrapper<this>;

    private readonly client: Client;

    /**
     * Creates an instance of SettingsWrapper.
     * 
     * @memberof SettingsWrapper
     */
    constructor(model: Model<GlobalSettingsDoc>) {
        super(model, {}, keys<GlobalSettingsObject>());
        this.setDataGetters(['prefix', 'presence', 'embedColors', 'commands', 'usageLimits']);

        this._usageLimits = new UsageLimitsWrapper(this);
        this.client = container.resolve(Client);

        this.subToMappedProperty('presence').subscribe(() => this.client.user.setPresence(this.presence));

        this.setIfLoadedProperty('prefix', () => this.data.value.prefix || '?!');
        this.setIfLoadedProperty('presence', () => this.data.value.presence || { status: 'online', afk: false, activity: {} });
        this.setIfLoadedProperty('embedColors', () => this.data.value.embedColors || {
            default: 8311585,
            help: 8311585,
            neutral: 4868682,
            negative: 15805477,
            warn: 16086051,
            positive: 8311585
        });
        this.setIfLoadedProperty('commands', () => this.data.value.commands || {});
        this.setIfLoadedProperty('usageLimits', () => this._usageLimits);
    }

    /**
     * Gets the specified embed color
     *
     * @param {keyof SettingsWrapper['embedColors']} name
     * @returns
     * @memberof SettingsWrapper
     */
    async getColor(name: keyof SettingsWrapper['embedColors']) {
        await this.load('embedColors');
        return this.embedColors[name];
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
    async isBotMaster(user: UserResolvable) {
        let userID = this.client.users.resolveID(user);
        return (await this.getBotMasters()).includes(userID);
    }

}