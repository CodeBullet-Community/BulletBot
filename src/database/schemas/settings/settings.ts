import { PresenceData, Snowflake } from "discord.js";
import { CommandName } from "../../../commands";
import { UsageLimits, ExDocument, usageLimitSchemaDefinition } from "../global";
import { Schema } from "mongoose";

/**
 * Raw global settings object from the database
 */
export interface GlobalSettingsObject {
    prefix: string;
    presence: PresenceData;
    embedColors: {
        default: number;
        help: number;
        neutral: number;
        negative: number;
        warn: number;
        positive: number;
    };
    botMasters: Snowflake[];
    commands: {
        // key is command name
        [K in CommandName]: {
            [key: string]: any;
        };
    };
    filters: {
        // key is filter name
        [key: string]: {
            [key: string]: any;
        }
    };
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
    prefix: String,
    presence: {
        status: { type: String, required: false },
        afk: { type: Boolean, required: false },
        game: {
            name: { type: String, required: false },
            url: { type: String, required: false },
            type: { type: String, required: false }
        }
    },
    embedColor: {
        default: Number,
        help: Number,
        neutral: Number,
        bad: Number,
        warn: Number,
        positive: Number
    },
    botMasters: [String],
    commands: Schema.Types.Mixed,
    filters: Schema.Types.Mixed,
    usageLimits: { required: false, type: usageLimitSchemaDefinition }
}, {
    toObject: { minimize: false, versionKey: false },
    collection: 'settings'
});