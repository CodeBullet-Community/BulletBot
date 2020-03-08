import { Snowflake, TextChannel, GuildMember } from "discord.js";
import { Schema } from "mongoose";
import { CommandName } from "../../../commands";
import { UsageLimits, ExDocument, usageLimitSchemaDefinition } from "../global";
import { LogObject } from "./log";
import { WebhookObject } from "../webhooks/_webhooks";

/**
 * String representing a guild rank
 */
export type GuildRank = 'admins' | 'mods' | 'immune';
/**
 * Array with all assignable guild ranks
 */
export const guildRanks: GuildRank[] = ['admins', 'mods', 'immune']

/**
 * Settings object for a command
 */
export interface CommandSettings {
    _enabled?: boolean; // if enabled
    // custom settings of the command
    [key: string]: any;
}

/**
 * String representing a megalog function
 */
export type MegalogFunction = 'channelCreate' | 'channelDelete' | 'channelUpdate' | 'ban' |
    'unban' | 'memberJoin' | 'memberLeave' | 'nicknameChange' |
    'memberRolesChange' | 'guildNameChange' | 'messageDelete' | 'attachmentCache' |
    'messageEdit' | 'reactionAdd' | 'reactionRemove' | 'roleCreate' |
    'roleDelete' | 'roleUpdate' | 'voiceTransfer' | 'voiceMute' |
    'voiceDeaf';
/**
 * String representing a megalog function group
 */
export type MegalogGroup = 'all' | 'channels' | 'members' | 'roles' | 'voice' | 'messages' | 'reactions';
/**
 * Type for the megalog group definitions
 */
export type MegalogGroupDefinitions = { [T in MegalogGroup]: MegalogFunction[] };
/**
 * Object defining which functions are in what group
 */
export const megalogGroups: MegalogGroupDefinitions = {
    all: [
        'channelCreate',
        'channelDelete',
        'channelUpdate',
        'ban',
        'unban',
        'memberJoin',
        'memberLeave',
        'nicknameChange',
        'memberRolesChange',
        'guildNameChange',
        'messageDelete',
        'attachmentCache',
        'messageEdit',
        'reactionAdd',
        'reactionRemove',
        'roleCreate',
        'roleDelete',
        'roleUpdate',
        'voiceTransfer',
        'voiceMute',
        'voiceDeaf'],
    channels: ['channelCreate',
        'channelDelete',
        'channelUpdate'],
    members: ['memberJoin',
        'memberLeave', 'memberRolesChange'],
    roles: ['roleCreate',
        'roleDelete',
        'roleUpdate'],
    voice: ['voiceTransfer',
        'voiceMute',
        'voiceDeaf'],
    messages: ['messageDelete',
        'attachmentCache',
        'messageEdit'],
    reactions: ['reactionAdd',
        'reactionRemove']
};

/**
 * String representing a service webhooks are available for
 */
export type WebhookService = 'youtube';

/**
 * Object holding data for guild saved by BulletBot
 */
export interface BBGuild {
    id: Snowflake;
    prefix?: string;
    logChannel: Snowflake | TextChannel;
    caseChannel: Snowflake | TextChannel;
    totalCases: number;
    logs: (Schema.Types.ObjectId | LogObject)[];
    modmailChannel: Snowflake | TextChannel;
    webhooks: {
        // key is service name
        [K in WebhookService]?: (Schema.Types.ObjectId | WebhookObject)[];
    };
    locks: {
        // channel id
        [K in Snowflake]: {
            until?: number;
            allowOverwrites: Snowflake[];
            neutralOverwrites: Snowflake[];
        };
    };
    usageLimits?: UsageLimits;
    ranks: {
        admins: (Snowflake | GuildMember)[]; // role and user ids
        mods: (Snowflake | GuildMember)[]; // role and user ids
        immune: (Snowflake | GuildMember)[]; // role and user ids
    };
    commandSettings: {
        // key is command name
        [K in CommandName]: CommandSettings
    };
    megalog: {
        ignoreChannels: (Snowflake | TextChannel)[];
    } & { [T in MegalogFunction]: Snowflake | TextChannel };
}
/**
 * Object raw data about guild saved in database
 */
export interface GuildObject extends BBGuild {
    id: Snowflake;
    prefix?: string;
    logChannel: Snowflake;
    caseChannel: Snowflake;
    totalCases: number;
    logs: Schema.Types.ObjectId[];
    modmailChannel: Snowflake;
    webhooks: {
        // key is service name
        [K in WebhookService]?: Schema.Types.ObjectId[];
    };
    locks: {
        // channel id
        [K in Snowflake]: {
            until?: number;
            allowOverwrites: Snowflake[];
            neutralOverwrites: Snowflake[];
        };
    };
    usageLimits?: UsageLimits;
    ranks: {
        admins: Snowflake[]; // role and user ids
        mods: Snowflake[]; // role and user ids
        immune: Snowflake[]; // role and user ids
    };
    commandSettings: {
        // key is command name
        [K in CommandName]: CommandSettings
    };
    megalog: {
        ignoreChannels: Snowflake[];
    } & { [T in MegalogFunction]: Snowflake };
}
/**
 * Mongoose Document for GuildObject
 */
export type GuildDoc = ExDocument<GuildObject>;
/**
 * Schema for GuildObject
 */
export const guildSchema = new Schema({
    id: String,
    prefix: { required: false, type: String },
    logChannel: String,
    caseChannel: String,
    totalCases: Number,
    modmailChannel: String,
    logs: [Schema.Types.ObjectId],
    webhooks: {
        youtube: { required: false, type: [Schema.Types.ObjectId] }
    },
    locks: Schema.Types.Mixed,
    usageLimits: { required: false, type: usageLimitSchemaDefinition },
    ranks: {
        admins: [String],
        mods: [String],
        immune: [String],
    },
    commandSettings: Schema.Types.Mixed,
    megalog: {
        ignoreChannels: [String],
        channelCreate: { type: String, required: false },
        channelDelete: { type: String, required: false },
        channelUpdate: { type: String, required: false },
        ban: { type: String, required: false },
        unban: { type: String, required: false },
        memberJoin: { type: String, required: false },
        memberLeave: { type: String, required: false },
        nicknameChange: { type: String, required: false },
        memberRolesChange: { type: String, required: false },
        guildNameChange: { type: String, required: false },
        messageDelete: { type: String, required: false },
        attachmentCache: { type: String, required: false },
        messageEdit: { type: String, required: false },
        reactionAdd: { type: String, required: false },
        reactionRemove: { type: String, required: false },
        roleCreate: { type: String, required: false },
        roleDelete: { type: String, required: false },
        roleUpdate: { type: String, required: false },
        voiceTransfer: { type: String, required: false },
        voiceMute: { type: String, required: false },
        voiceDeaf: { type: String, required: false }
    }
}, { id: false, collection: 'guilds' });
