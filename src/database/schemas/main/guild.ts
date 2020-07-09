import { Collection, Snowflake, TextChannel } from 'discord.js';
import { Schema } from 'mongoose';

import { UsageLimitsWrapper } from '../../wrappers/shared/usageLimitsWrapper';
import { ExDocument, UsageLimits, usageLimitSchemaDefinition } from '../global';
import { CommandName } from '../../../commands/command';

/**
 * Object that defines a channel lock
 *
 * @export
 * @interface ChannelLock
 */
export interface ChannelLock {
    /**
     * Until when the channel is locked
     *
     * @type {number}
     */
    until?: number;
    /**
     * Overwrites which were on allow before being locked
     *
     * @type {Snowflake[]}
     */
    allowOverwrites: Snowflake[];
    /**
     * Overwrites which were on neutral before being locked
     *
     * @type {Snowflake[]}
     */
    neutralOverwrites: Snowflake[];
}

/**
 * String representing a guild rank
 */
export type GuildRank = 'admin' | 'mod' | 'immune';
/**
 * Array with all assignable guild ranks
 */
export const guildRanks: GuildRank[] = ['admin', 'mod', 'immune']

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
    /**
     * Id of guild
     *
     * @type {Snowflake}
     * @memberof BBGuild
     */
    id: Snowflake;
    /**
     * Custom prefix that the guild uses
     *
     * @type {string}
     * @memberof BBGuild
     */
    prefix?: string;
    /**
     * Channel which LogLogger send logs to
     *
     * @type {(Snowflake | TextChannel)}
     * @memberof BBGuild
     */
    logChannel?: Snowflake | TextChannel;
    /**
     * Channel which CaseLogger send logs to
     *
     * @type {(Snowflake | TextChannel)}
     * @memberof BBGuild
     */
    caseChannel?: Snowflake | TextChannel;
    /**
     * Total cases in guild to track next case id.
     * When a case gets removed, the number stays unchanged
     *
     * @type {number}
     * @memberof BBGuild
     */
    totalCases: number;
    /**
     * Channel locks currently active in guild
     *
     * @memberof BBGuild
     */
    locks: {
        [K in Snowflake]: ChannelLock;
    } | Collection<string, unknown>; // TODO: add Collection of LockChannelWrappers
    /**
     * Usage limits specific to this guild
     *
     * @type {(UsageLimits | UsageLimitsWrapper<any>)}
     * @memberof BBGuild
     */
    usageLimits?: UsageLimits | UsageLimitsWrapper<any>;
    /**
     * Different GuildRanks with both role and user ids in one array
     *
     * @memberof BBGuild
     */
    ranks: {
        [Rank in GuildRank]: Snowflake[];
    };
    /**
     * Commands settings for the different commands
     *
     * @memberof BBGuild
     */
    commandSettings: {
        [K in CommandName]: CommandSettings
    };
    /**
     * Megalog settings for this guild
     *
     * @memberof BBGuild
     */
    megalog: {
        /**
         * Channels of which events will not be logged
         *
         * @type {((Snowflake | TextChannel)[])}
         */
        ignoreChannels: (Snowflake | TextChannel)[];
    } & { [T in MegalogFunction]?: Snowflake | TextChannel };
}
/**
 * Object raw data about guild saved in database
 */
export interface GuildObject extends BBGuild {
    logChannel?: Snowflake;
    caseChannel?: Snowflake;
    locks: {
        [K in Snowflake]: ChannelLock;
    };
    usageLimits?: UsageLimits;
    megalog: {
        ignoreChannels: Snowflake[];
    } & { [T in MegalogFunction]?: Snowflake };
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
    logChannel: { required: false, type: String },
    caseChannel: { required: false, type: String },
    totalCases: Number,
    locks: Schema.Types.Mixed,
    usageLimits: { required: false, type: usageLimitSchemaDefinition },
    ranks: {
        admin: [String],
        mod: [String],
        immune: [String],
    },
    commandSettings: Schema.Types.Mixed,
    megalog: Schema.Types.Mixed
}, { id: false, collection: 'guilds' });
