import mongoose = require('mongoose');
import { PresenceData, DMChannel, GroupDMChannel, TextChannel, User } from 'discord.js';
import { Bot } from '..';

// usageLimits
export interface UsageLimits {
    commands?: {
        [key: string]: CommandUsageLimits;
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
export interface guildObject {
    guild?: string | any; // from old version
    id: string;
    prefix?: string;
    logChannel: string;
    caseChannel: string;
    totalCases: number;
    logs: mongoose.Schema.Types.ObjectId[];
    staff: mongoose.Schema.Types.ObjectId;
    modmailChannel: string,
    webhooks: {
        // key is service name
        [key: string]: mongoose.Schema.Types.ObjectId[];
    };
    locks: {
        // channel id
        [key: string]: {
            until?: number;
            allowOverwrites: string[];
            neutralOverwrites: string[];
        };
    };
    usageLimits?: UsageLimits;
    ranks: {
        admins: string[]; // role and user ids
        mods: string[]; // role and user ids
        immune: string[]; // role and user ids
    };
    commandSettings: {
        // key is command name
        [key: string]: {
            _enabled: boolean; // if enabled
            // custom settings of the command
            [key: string]: any;
        }
    };
    megalog: {
        ignoreChannels: string[]; // array of channel ids
        channelCreate?: string; // channel id
        channelDelete?: string; // channel id
        channelUpdate?: string; // channel id
        ban?: string; // channel id
        unban?: string; // channel id
        memberJoin?: string; // channel id
        memberLeave?: string; // channel id
        nicknameChange?: string; // channel id
        memberRolesChange?: string; // channel id
        guildNameChange?: string; // channel id
        messageDelete?: string; // channel id
        attachmentCache?: string; // channel id
        messageEdit?: string; // channel id
        reactionAdd?: string; // channel id
        reactionRemove?: string; // channel id
        roleCreate?: string; // channel id
        roleDelete?: string; // channel id
        roleUpdate?: string; // channel id
        voiceTranfer?: string; // channel id
        voiceMute?: string; // channel id
        voiceDeaf?: string; // channel id
    };
}
export interface guildDoc extends mongoose.Document, guildObject {
    id: string;
}
export const guildSchema = new mongoose.Schema({
    guild: String,
    prefix: { required: false, type: String },
    logChannel: String,
    caseChannel: String,
    totalCases: Number,
    modmailChannel: String,
    logs: [mongoose.Schema.Types.ObjectId],
    staff: mongoose.Schema.Types.ObjectId,
    webhooks: {
        youtube: [mongoose.Schema.Types.ObjectId]
    },
    locks: mongoose.Schema.Types.Mixed,
    usageLimits: { required: false, type: usageLimitSchema },
    rank: {
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

// staff
export type StaffRanks = 'admins' | 'mods' | 'immune';
export interface staffObject {
    guild: string;
    admins: {
        roles: string[];
        users: string[];
    };
    mods: {
        roles: string[];
        users: string[];
    };
    immune: {
        roles: string[];
        users: string[];
    };
}
export interface staffDoc extends mongoose.Document, staffObject { }
export const staffSchema = new mongoose.Schema({
    guild: String,
    admins: {
        roles: [String],
        users: [String]
    },
    mods: {
        roles: [String],
        users: [String]
    },
    immune: {
        roles: [String],
        users: [String]
    }
});

// commands
export interface commandsObject {
    guild: string;
    commands: {
        // key is command name
        [key: string]: {
            _enabled: boolean;
            [key: string]: any;
        }
    }
}
export interface commandsDoc extends mongoose.Document, commandsObject { }
export const commandsSchema = new mongoose.Schema({
    guild: String,
    commands: mongoose.Schema.Types.Mixed
});

// filters
export interface filtersObject {
    guild: string;
    filters: {
        // key is filter name
        [key: string]: {
            _enabled: boolean;
            [key: string]: any;
        }
    }
}
export interface filtersDoc extends mongoose.Document, filtersObject { }
export const filtersSchema = new mongoose.Schema({
    guild: String,
    filters: mongoose.Schema.Types.Mixed
});

// log
export interface logObject {
    guild: string;
    action: number;
    mod: string;
    timestamp: number;
    info?: logStaff | logWebhook | logFilter | logCommand | logPrefix | logMegalog | logMegalogIgnore;
}
export interface logDoc extends mongoose.Document, logObject { }
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
export enum logTypes {
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
export enum logActions {
    staff = 0,
    webhook = 1,
    filter = 2,
    command = 3,
    prefix = 4,
    megalog = 5,
    megalogIgnore = 6
}

export interface logStaff {
    type: logTypes.add | logTypes.remove; // add or remove
    rank: 'admins' | 'mods' | 'immune';
    role?: string; // role id
    user?: string; // user id
}

export interface logWebhook {
    type: logTypes; // add, remove or change
    service: string; // service name
    webhookID: string; // doc id
    changedChannel?: boolean; // if channel was changed
    changedMessage?: boolean; // if message was changed
}

export interface logFilter {
    type: logTypes.add | logTypes.remove; // add, remove or change
    filter: string; // filter name
}

export interface logCommand {
    type: logTypes.add | logTypes.remove; // add, remove or change
    command: string; // command name
}

export interface logPrefix {
    old: string,
    new: string
}

export interface logMegalog {
    type: logTypes.add | logTypes.remove; // add/remove
    functions: string[]; // functions enabled/disabled
    channel?: string // channel ID
}

export interface logMegalogIgnore {
    type: logTypes.add | logTypes.remove; // add/remove
    channel?: string // channel ID
}

// command cache
export interface commandCacheObject {
    channel: string;
    user: string;
    command: string;
    cache: any;
    delete: number;
}

export interface commandCacheDoc extends mongoose.Document, commandCacheObject { }
export const commandCacheSchema = new mongoose.Schema({
    channel: String,
    user: String,
    command: String,
    cache: mongoose.Schema.Types.Mixed,
    delete: Number
});

// user
export interface userObject {
    user: string; // user id
    commandLastUsed: {
        // guild id, 'dm' and 'global'
        [key: string]: {
            // command name
            [key: string]: number; // timestamp until it can be reused again
        };
    };
}
export interface userDoc extends mongoose.Document, userObject { }
export const userSchema = new mongoose.Schema({
    user: String,
    commandLastUsed: mongoose.Schema.Types.Mixed
});

// megalog settings
export interface megalogObject {
    guild: string; // guild id
    ignoreChannels: string[]; // channel ids
    channelCreate: string;
    channelDelete: string;
    channelUpdate: string;
    ban: string;
    unban: string;
    memberJoin: string;
    memberLeave: string;
    nicknameChange: string;
    memberRolesChange: string;
    guildNameChange: string;
    messageDelete: string;
    attachmentCache: string;
    messageEdit: string;
    reactionAdd: string;
    reactionRemove: string;
    roleCreate: string;
    roleDelete: string;
    roleUpdate: string;
    voiceTransfer: string;
    voiceMute: string;
    voiceDeaf: string;
}
export interface megalogDoc extends mongoose.Document, megalogObject { }
export const megalogSchema = new mongoose.Schema({
    guild: String,
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
});
export const megalogFunctions = {
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

// pAction
export enum pActionActions {
    mute = 'mute',
    lockChannel = 'lockChannel',
    ban = 'ban',
    resubWebhook = 'resubWebhook'
}

export interface pActionObject {
    from: number;
    to: number;
    action: pActionActions;
    info: pActionMute | pActionBan | pActionLockChannel | pActionResubWebhook;
};
export interface pActionDoc extends mongoose.Document, pActionObject { };
export const pActionSchema = new mongoose.Schema({
    from: Number,
    to: Number,
    action: String,
    info: mongoose.Schema.Types.Mixed
});

export interface pActionMute {
    guild: string;
    user: string;
    case: number;
}
export interface pActionBan {
    guild: string;
    user: string;
    case: number;
}
export interface pActionLockChannel {
    guild: string;
    channel: string;
    allowOverwrites: string[];
    neutralOverwrites: string[];
}
export interface pActionResubWebhook {
    service: string;
}

// case
export enum caseActions {
    ban = 'ban',
    warn = 'warn',
    mute = 'mute',
    kick = 'kick',
    softban = 'softban',
    unmute = 'unmute',
    unban = 'unban'
};

export const caseActionsArray = ['ban', 'warn', 'mute', 'kick', 'softban', 'unmute', 'unban'];

export interface caseObject {
    guild: string;
    caseID: number;
    user: string;
    action: string;
    timestamp: number;
    duration?: number;
    mod: string;
    reason?: string;
}

export interface caseDoc extends mongoose.Document, caseObject { }
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

export interface mStatsObject {
    messagesReceived: number; // all messages recieved
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
        [key: string]: {
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
        [key: string]: {
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
            channelCreate: number;
            channelDelete: number;
            channelUpdate: number;
            ban: number;
            unban: number;
            memberJoin: number;
            memberLeave: number;
            nicknameChange: number;
            memberRolesChange: number;
            guildNameChange: number;
            messageDelete: number;
            attachmentCache: number;
            messageEdit: number;
            reactionAdd: number;
            reactionRemove: number;
            roleCreate: number;
            roleDelete: number;
            roleUpdate: number;
            voiceTranfer: number;
            voiceMute: number;
            voiceDeaf: number;
        };
        logged: {
            channelCreate: number;
            channelDelete: number;
            channelUpdate: number;
            ban: number;
            unban: number;
            memberJoin: number;
            memberLeave: number;
            nicknameChange: number;
            memberRolesChange: number;
            guildNameChange: number;
            messageDelete: number;
            attachmentCache: number;
            messageEdit: number;
            reactionAdd: number;
            reactionRemove: number;
            roleCreate: number;
            roleDelete: number;
            roleUpdate: number;
            voiceTranfer: number;
            voiceMute: number;
            voiceDeaf: number;
        };
    };
}
export function createEmptyMStatsObject(): mStatsObject {
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
                voiceTranfer: 0,
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
                voiceTranfer: 0,
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
            voiceTranfer: Number,
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
            voiceTranfer: Number,
            voiceMute: Number,
            voiceDeaf: Number
        }
    }
}

// allTime
export interface mStatsAllTimeObject extends mStatsObject {
    from: number;
    to: number;
}
export interface mStatsAllTimeDoc extends mongoose.Document, mStatsAllTimeObject { }
var mStatsAllTimeSchemaStruc: any = mStatsSchemaStruc;
mStatsAllTimeSchemaStruc.from = Number;
mStatsAllTimeSchemaStruc.to = Number;
export const mStatsAllTimeSchema = new mongoose.Schema(mStatsAllTimeSchemaStruc);

// day
export interface mStatsDayObject extends mStatsObject {
    day: number;
}
export interface mStatsDayDoc extends mongoose.Document, mStatsDayObject { }
var mStatsDaySchemaStruc: any = mStatsSchemaStruc;
mStatsDaySchemaStruc.day = Number;
export const mStatsDaySchema = new mongoose.Schema(mStatsDaySchemaStruc);

// hour
export interface mStatsHourObject extends mStatsObject {
    day: number;
    hour: number;
}
export interface mStatsHourDoc extends mongoose.Document, mStatsDayObject { }
var mStatsHourSchemaStruc: any = mStatsSchemaStruc;
mStatsHourSchemaStruc.day = Number;
mStatsHourSchemaStruc.hour = Number;
export const mStatsHourSchema = new mongoose.Schema(mStatsHourSchemaStruc);

// error
export interface errorObject {
    first: number;
    last: number;
    md5: string;
    count: number;
    error: any;
}
export interface errorDoc extends mongoose.Document, errorObject { }
export const errorSchema = new mongoose.Schema({
    first: Number,
    last: Number,
    md5: String,
    count: Number,
    error: mongoose.Schema.Types.Mixed
});

// bug
export interface bugObject {
    guild?: string; // guild ID where it was reported (optional)
    user: string; // user ID which reported it
    bug: string; // bug description
}
export interface bugDoc extends mongoose.Document, bugObject { }
export const bugSchema = new mongoose.Schema({
    guild: { type: String, required: false },
    user: String,
    bug: String,
});

// suggestion
export interface botSuggestionObject {
    guild?: string; // guild ID where it was suggested (optional)
    user: string; // user ID which suggested it
    suggestion: string; // suggestion description
}
export interface botSuggestionDoc extends mongoose.Document, botSuggestionObject { }
export const botSuggestionSchema = new mongoose.Schema({
    guild: { type: String, required: false },
    user: String,
    suggestion: String,
});

// youtube webhook
export interface webhookObject {
    feed: string;
    guild: string;
    channel: string;
    message: string;
}
export interface webhookDoc extends mongoose.Document, webhookObject { }
export const webhookSchema = new mongoose.Schema({
    feed: String,
    guild: String,
    channel: String,
    message: String
});

// global settings
export interface globalSettingsObject {
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
    botMasters: string[];
    commands: {
        // key is command name
        [key: string]: {
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
export interface globalSettingsDoc extends mongoose.Document, globalSettingsObject { }
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
