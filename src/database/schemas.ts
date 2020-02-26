import { PresenceData, Snowflake, DMChannel, GroupDMChannel, TextChannel, User } from 'discord.js';
import _ from 'lodash';
import { ObjectId } from 'mongodb';
import mongoose = require('mongoose');

import { CommandName, commandInterface } from '../commands';

/**
 * A document that extends on a specific Object
 */
export type ExDocument<T> = T & mongoose.Document;
/**
 * A key of an Object
 */
export type ObjectKey = string | number | symbol;
/**
 * Array of keys of a specific Object
 */
export type Keys<T> = (keyof T)[];
/**
 * Array of keys or a single key of a specific Object
 */
export type OptionalFields<T> = keyof T | Keys<T>;

// usageLimits
export interface UsageLimits {
    commands?: {
        [K in CommandName]: CommandUsageLimits;
    };
    cases?: {
        maxCases?: number;
        storeTime?: number;
    };
    webhooks?: {
        maxWebhooks?: number;
        maxMessageLength?: number;
    };
    pActions?: {
        maxTime: number;
    };
    megalog?: {
        disabled: [string];
    };
    logs?: {
        maxLogs?: number;
        storeTime?: number;
    };
    guild?: {
        maxInactiveTime: number;
    };
}

export interface CommandUsageLimits {
    globalCooldown?: number;
    localCooldown?: number;
    enabled?: boolean;
}

let usageLimitSchema: mongoose.SchemaDefinition = {
    commands: { required: false, type: mongoose.Schema.Types.Mixed },
    cases: {
        required: false,
        type: {
            maxCases: { required: false, type: Number },
            storeTime: { required: false, type: Number }
        }
    },
    webhooks: {
        required: false,
        type: {
            maxWebhooks: { required: false, type: Number },
            maxMessageLength: { required: false, type: Number }
        }
    },
    pActions: {
        required: false,
        type: {
            maxTime: { required: false, type: Number }
        }
    },
    megalog: {
        required: false,
        type: {
            disabled: [String]
        }
    },
    logs: {
        required: false,
        type: {
            maxLogs: { required: false, type: Number },
            storeTime: { required: false, type: Number }
        }
    },
    guild: {
        required: false,
        type: {
            maxInactiveTime: Number
        }
    }
}

// guild
export type GuildRank = 'admins' | 'mods' | 'immune';
export const guildRanks: GuildRank[] = ['admins', 'mods', 'immune']

export interface CommandSettings {
    _enabled?: boolean; // if enabled
    // custom settings of the command
    [key: string]: any;
}

export type MegalogFunction = 'channelCreate' | 'channelDelete' | 'channelUpdate' | 'ban' |
    'unban' | 'memberJoin' | 'memberLeave' | 'nicknameChange' |
    'memberRolesChange' | 'guildNameChange' | 'messageDelete' | 'attachmentCache' |
    'messageEdit' | 'reactionAdd' | 'reactionRemove' | 'roleCreate' |
    'roleDelete' | 'roleUpdate' | 'voiceTransfer' | 'voiceMute' |
    'voiceDeaf';

export type MegalogGroup = 'all' | 'channels' | 'members' | 'roles' | 'voice' | 'messages' | 'reactions';
export type MegalogGroupDefinitions = { [T in MegalogGroup]: MegalogFunction[] };

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

export type WebhookService = 'youtube';

export interface GuildObject {
    id: Snowflake;
    prefix?: string;
    logChannel: Snowflake;
    caseChannel: Snowflake;
    totalCases: number;
    logs: mongoose.Schema.Types.ObjectId[];
    modmailChannel: Snowflake;
    webhooks: {
        // key is service name
        [K in WebhookService]?: mongoose.Schema.Types.ObjectId[];
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
export type GuildDoc = ExDocument<GuildObject>;
export const guildSchema = new mongoose.Schema({
    guild: { type: String, required: false }, // from old version
    id: String,
    prefix: { required: false, type: String },
    logChannel: String,
    caseChannel: String,
    totalCases: Number,
    modmailChannel: String,
    logs: [mongoose.Schema.Types.ObjectId],
    webhooks: {
        youtube: { required: false, type: [mongoose.Schema.Types.ObjectId] }
    },
    locks: mongoose.Schema.Types.Mixed,
    usageLimits: { required: false, type: usageLimitSchema },
    ranks: {
        admins: [String],
        mods: [String],
        immune: [String],
    },
    commandSettings: mongoose.Schema.Types.Mixed,
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
}, { id: false });

// filters
export interface FiltersObject {
    guild: Snowflake;
    filters: {
        // key is filter name
        [key: string]: {
            _enabled: boolean;
            [key: string]: any;
        }
    }
}
export type FiltersDoc = ExDocument<FiltersObject>;
export const filtersSchema = new mongoose.Schema({
    guild: String,
    filters: mongoose.Schema.Types.Mixed
});

// log
export interface LogObject {
    guild: Snowflake;
    action: number;
    mod: Snowflake;
    timestamp: number;
    info?: LogStaff | LogWebhook | LogFilter | LogCommand | LogPrefix | LogMegalog | LogMegalogIgnore;
}
export type LogDoc = ExDocument<LogObject>;
export const logSchema = new mongoose.Schema({
    guild: String,
    action: Number,
    mod: String,
    timestamp: Number,
    info: mongoose.Schema.Types.Mixed
});

/**
 * unified way of saying if something was added, removed or changed
 *
 * @export
 * @enum {number}
 */
export enum LogTypes {
    add = 0,
    remove = 1,
    change = 2
}

/**
 * defines what was specifically changed
 *
 * @export
 * @enum {number}
 */
export enum LogActions {
    staff = 0,
    webhook = 1,
    filter = 2,
    command = 3,
    prefix = 4,
    megalog = 5,
    megalogIgnore = 6
}

export interface LogStaff {
    type: LogTypes.add | LogTypes.remove; // add or remove
    rank: 'admins' | 'mods' | 'immune';
    role?: Snowflake; // role id
    user?: Snowflake; // user id
}

export interface LogWebhook {
    type: LogTypes; // add, remove or change
    service: WebhookService; // service name
    webhookID: ObjectId; // doc id
    changedChannel?: boolean; // if channel was changed
    changedMessage?: boolean; // if message was changed
}

export interface LogFilter {
    type: LogTypes.add | LogTypes.remove; // add, remove or change
    filter: string; // filter name
}

export interface LogCommand {
    type: LogTypes.add | LogTypes.remove; // add, remove or change
    command: CommandName; // command name
}

export interface LogPrefix {
    old: string,
    new: string
}

export interface LogMegalog {
    type: LogTypes.add | LogTypes.remove; // add/remove
    functions: MegalogFunction[]; // functions enabled/disabled
    channel?: Snowflake // channel ID
}

export interface LogMegalogIgnore {
    type: LogTypes.add | LogTypes.remove; // add/remove
    channel?: Snowflake // channel ID
}

// CommandCache
export interface CommandCache {
    channel: Snowflake | DMChannel | TextChannel;
    user: Snowflake | User;
    command: CommandName | commandInterface;
    permLevel: number;
    cache: any;
    expirationTimestamp: number | Date;
}
export interface CommandCacheObject extends CommandCache {
    channel: Snowflake;
    user: Snowflake;
    command: CommandName;
    permLevel: number;
    cache: any;
    expirationTimestamp: number;
}
export type CommandCacheDoc = ExDocument<CommandCacheObject>;
export const commandCacheSchema = new mongoose.Schema({
    channel: String,
    user: String,
    command: String,
    permLevel: Number,
    cache: mongoose.Schema.Types.Mixed,
    expirationTimestamp: Number
});

// user
export type CommandScope = 'dm' | 'guild' | Snowflake;
export interface UserObject {
    id: Snowflake; // user id
    commandLastUsed: {
        [K in CommandScope]?: {
            [K in CommandName]: number; // timestamp until it can be reused again
        };
    };
}
export type UserDoc = ExDocument<UserObject>;
export const userSchema = new mongoose.Schema({
    id: String,
    commandLastUsed: mongoose.Schema.Types.Mixed
});

// pAction
export enum PActionActions {
    mute = 'mute',
    lockChannel = 'lockChannel',
    ban = 'ban',
    resubWebhook = 'resubWebhook'
}

export interface PActionObject {
    from: number;
    to: number;
    action: PActionActions;
    info: PActionMute | PActionBan | PActionLockChannel | PActionResubWebhook;
};
export interface PActionDoc extends mongoose.Document, PActionObject { };
export const pActionSchema = new mongoose.Schema({
    from: Number,
    to: Number,
    action: String,
    info: mongoose.Schema.Types.Mixed
});

export interface PActionMute {
    guild: Snowflake;
    user: Snowflake;
    case: number;
}
export interface PActionBan {
    guild: Snowflake;
    user: Snowflake;
    case: number;
}
export interface PActionLockChannel {
    guild: Snowflake;
    channel: Snowflake;
    allowOverwrites: Snowflake[];
    neutralOverwrites: Snowflake[];
}
export interface PActionResubWebhook {
    service: WebhookService;
}

// case
export type CaseAction = 'ban' | 'warn' | 'mute' | 'kick' | 'softban' | 'unmute' | 'unban';
export enum CaseActions {
    ban = 'ban',
    warn = 'warn',
    mute = 'mute',
    kick = 'kick',
    softban = 'softban',
    unmute = 'unmute',
    unban = 'unban'
};

export const caseActionsArray = ['ban', 'warn', 'mute', 'kick', 'softban', 'unmute', 'unban'];

export interface CaseObject {
    guild: Snowflake;
    caseID: number;
    user: Snowflake;
    action: CaseAction;
    timestamp: number;
    duration?: number;
    mod: Snowflake;
    reason?: string;
}

export type CaseDoc = ExDocument<CaseObject>;
export const caseSchema = new mongoose.Schema({
    guild: String,
    caseID: Number,
    user: String,
    action: String,
    timestamp: Number,
    duration: { type: Number, required: false },
    mod: String,
    reason: { type: String, required: false },
});

export interface MStatsObject {
    messagesReceived: number; // all messages received
    messagesSend: number; // all messages send
    logs: number; // total logs created
    guildsJoined: number;
    guildsLeft: number;
    guildsTotal: number;
    errorsTotal: number;
    bugs: number; // total bugs reported
    botSuggestions: number; // total bot suggestions made
    commandTotal: number; // total used
    commands: {
        // key is command name, usage data
        [K in CommandName]: {
            _errors: number; // total errors caught
            _resp: number; // response time in ms (when first replay send, so ping doesn't get counted)
            _main?: number; // main command
            // subcommand like add, rem, list
            [key: string]: number;
        }
    };
    filters: {
        // key is filter name, catch data
        [key: string]: number;
    };
    webhooks: {
        // key is service name
        [K in WebhookService]?: {
            total: number; // how many exist
            created: number;
            changed: number;
            deleted: number;
        }
    };
    ping: {
        clientAPI: number; // client ping
        cluster: number;
    };
    megalog: {
        enabled: {
            [K in MegalogFunction]: number;
        };
        logged: {
            [K in MegalogFunction]: number;
        };
    };
}
export function createEmptyMStatsObject(): MStatsObject {
    return {
        messagesReceived: 0,
        messagesSend: 0,
        logs: 0,
        guildsJoined: 0,
        guildsLeft: 0,
        guildsTotal: 0,
        errorsTotal: 0,
        bugs: 0,
        botSuggestions: 0,
        commandTotal: 0,
        commands: {},
        filters: {},
        webhooks: {},
        ping: {
            clientAPI: 0,
            cluster: 0
        },
        megalog: {
            enabled: {
                channelCreate: 0,
                channelDelete: 0,
                channelUpdate: 0,
                ban: 0,
                unban: 0,
                memberJoin: 0,
                memberLeave: 0,
                nicknameChange: 0,
                memberRolesChange: 0,
                guildNameChange: 0,
                messageDelete: 0,
                attachmentCache: 0,
                messageEdit: 0,
                reactionAdd: 0,
                reactionRemove: 0,
                roleCreate: 0,
                roleDelete: 0,
                roleUpdate: 0,
                voiceTransfer: 0,
                voiceMute: 0,
                voiceDeaf: 0
            },
            logged: {
                channelCreate: 0,
                channelDelete: 0,
                channelUpdate: 0,
                ban: 0,
                unban: 0,
                memberJoin: 0,
                memberLeave: 0,
                nicknameChange: 0,
                memberRolesChange: 0,
                guildNameChange: 0,
                messageDelete: 0,
                attachmentCache: 0,
                messageEdit: 0,
                reactionAdd: 0,
                reactionRemove: 0,
                roleCreate: 0,
                roleDelete: 0,
                roleUpdate: 0,
                voiceTransfer: 0,
                voiceMute: 0,
                voiceDeaf: 0
            }
        }
    };
}
const mStatsSchemaStruc = {
    messagesReceived: Number,
    messagesSend: Number,
    logs: Number,
    guildsJoined: Number,
    guildsLeft: Number,
    guildsTotal: Number,
    errorsTotal: Number,
    bugs: Number,
    botSuggestions: Number,
    commandTotal: Number,
    commands: mongoose.Schema.Types.Mixed,
    filters: mongoose.Schema.Types.Mixed,
    webhooks: mongoose.Schema.Types.Mixed,
    ping: {
        clientAPI: Number,
        cluster: Number
    },
    megalog: {
        enabled: {
            channelCreate: Number,
            channelDelete: Number,
            channelUpdate: Number,
            ban: Number,
            unban: Number,
            memberJoin: Number,
            memberLeave: Number,
            nicknameChange: Number,
            memberRolesChange: Number,
            guildNameChange: Number,
            messageDelete: Number,
            attachmentCache: Number,
            messageEdit: Number,
            reactionAdd: Number,
            reactionRemove: Number,
            roleCreate: Number,
            roleDelete: Number,
            roleUpdate: Number,
            voiceTransfer: Number,
            voiceMute: Number,
            voiceDeaf: Number
        },
        logged: {
            channelCreate: Number,
            channelDelete: Number,
            channelUpdate: Number,
            ban: Number,
            unban: Number,
            memberJoin: Number,
            memberLeave: Number,
            nicknameChange: Number,
            memberRolesChange: Number,
            guildNameChange: Number,
            messageDelete: Number,
            attachmentCache: Number,
            messageEdit: Number,
            reactionAdd: Number,
            reactionRemove: Number,
            roleCreate: Number,
            roleDelete: Number,
            roleUpdate: Number,
            voiceTransfer: Number,
            voiceMute: Number,
            voiceDeaf: Number
        }
    }
}

// allTime
export interface MStatsAllTimeObject extends MStatsObject {
    from: number;
    to: number;
}
export type MStatsAllTimeDoc = ExDocument<MStatsAllTimeObject>;
var mStatsAllTimeSchemaStruc: any = _.cloneDeep(mStatsSchemaStruc);
mStatsAllTimeSchemaStruc.from = Number;
mStatsAllTimeSchemaStruc.to = Number;
export const mStatsAllTimeSchema = new mongoose.Schema(mStatsAllTimeSchemaStruc);

// day
export interface MStatsDayObject extends MStatsObject {
    day: number;
}
export type MStatsDayDoc = ExDocument<MStatsDayObject>;
var mStatsDaySchemaStruc: any = _.cloneDeep(mStatsSchemaStruc);
mStatsDaySchemaStruc.day = Number;
export const mStatsDaySchema = new mongoose.Schema(mStatsDaySchemaStruc);

// hour
export interface MStatsHourObject extends MStatsObject {
    day: number;
    hour: number;
}
export type MStatsHourDoc = ExDocument<MStatsHourObject>;
var mStatsHourSchemaStruc: any = _.cloneDeep(mStatsSchemaStruc);
mStatsHourSchemaStruc.day = Number;
mStatsHourSchemaStruc.hour = Number;
export const mStatsHourSchema = new mongoose.Schema(mStatsHourSchemaStruc);

// error
export interface ErrorObject {
    first: number;
    last: number;
    md5: string;
    count: number;
    error: any;
}
export type ErrorDoc = ExDocument<ErrorObject>;
export const errorSchema = new mongoose.Schema({
    first: Number,
    last: Number,
    md5: String,
    count: Number,
    error: mongoose.Schema.Types.Mixed
});

// bug
export interface BugObject {
    guild?: Snowflake; // guild ID where it was reported (optional)
    user: Snowflake; // user ID which reported it
    bug: string; // bug description
}
export type BugDoc = ExDocument<BugObject>;
export const bugSchema = new mongoose.Schema({
    guild: { type: String, required: false },
    user: String,
    bug: String,
});

// suggestion
export interface BotSuggestionObject {
    guild?: Snowflake; // guild ID where it was suggested (optional)
    user: Snowflake; // user ID which suggested it
    suggestion: string; // suggestion description
}
export type BotSuggestionDoc = ExDocument<BotSuggestionObject>;
export const botSuggestionSchema = new mongoose.Schema({
    guild: { type: String, required: false },
    user: String,
    suggestion: String,
});

// youtube webhook
export interface WebhookObject {
    feed: string;
    guild: Snowflake;
    channel: Snowflake;
    message: string;
}
export type WebhookDoc = ExDocument<WebhookObject>;
export const webhookSchema = new mongoose.Schema({
    feed: String,
    guild: String,
    channel: String,
    message: String
});

// global settings
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
export type GlobalSettingsDoc = ExDocument<GlobalSettingsObject>;
export let globalSettingsSchema = new mongoose.Schema({
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
    commands: mongoose.Schema.Types.Mixed,
    filters: mongoose.Schema.Types.Mixed,
    usageLimits: { required: false, type: usageLimitSchema }
});
globalSettingsSchema.set('toObject', { minimize: false, versionKey: false });
