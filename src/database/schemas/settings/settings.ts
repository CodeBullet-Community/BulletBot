import { PresenceData, Snowflake } from 'discord.js';
import { Schema } from 'mongoose';

import { CommandName } from '../../../commands/command';
import { SettingsWrapper } from '../../wrappers/settings/settingsWrapper';
import { UsageLimitsWrapper } from '../../wrappers/shared/usageLimitsWrapper';
import { ExDocument, UsageLimits, usageLimitSchemaDefinition } from '../global';

/**
 * Global settings of the bot that can be dynamically changed during runtime
 * 
 * @export
 * @interface GlobalSettings
 */
export interface GlobalSettings {
    /**
     * Token used to log the bot into discord
     *
     * @type {string}
     * @memberof GlobalSettings
     */
    botToken: string;
    /**
     * Default prefix for all guilds and users
     *
     * @type {string}
     * @memberof GlobalSettingsObject
     */
    prefix?: string;
    /**
     * Current presence of bot
     *
     * @type {PresenceData}
     * @memberof GlobalSettingsObject
     */
    presence?: PresenceData;
    /**
     * Color scheme of bot defined with color codes
     * 
     * @memberof GlobalSettingsObject
     */
    embedColors?: {
        default: number;
        help: number;
        neutral: number;
        negative: number;
        warn: number;
        positive: number;
    };
    /**
     * List of ids of bot masters
     *
     * @type {Snowflake[]}
     * @memberof GlobalSettingsObject
     */
    botMasters: Snowflake[];
    /**
     * Global command settings 
     *
     * @memberof GlobalSettingsObject
     */
    commands?: {
        [Command in CommandName]: {
            [key: string]: any;
        };
    };
    /**
     * Global and default usage limits
     *
     * @type {UsageLimits}
     * @memberof GlobalSettingsObject
     */
    usageLimits?: UsageLimits | UsageLimitsWrapper<SettingsWrapper>;
}

/**
 * Raw global settings object from the database
 */
export interface GlobalSettingsObject extends GlobalSettings {
    usageLimits?: UsageLimits;
}
/**
 * Mongoose Document for GlobalSettingsObject
 */
export type GlobalSettingsDoc = ExDocument<GlobalSettingsObject>;
/**
 * Schema for GlobalSettingsObject
 */
export let globalSettingsSchema = new Schema({
    botToken: String,
    prefix: { required: false, type: String },
    presence: {
        required: false, type: {
            status: { type: String, required: false },
            afk: { type: Boolean, required: false },
            game: {
                name: { type: String, required: false },
                url: { type: String, required: false },
                type: { type: String, required: false }
            }
        }
    },
    embedColors: {
        required: false, type: {
            default: Number,
            help: Number,
            neutral: Number,
            bad: Number,
            warn: Number,
            positive: Number
        }
    },
    botMasters: [String],
    commands: { required: false, type: Schema.Types.Mixed },
    usageLimits: { required: false, type: usageLimitSchemaDefinition }
}, {
    toObject: { minimize: false, versionKey: false },
    collection: 'settings'
});