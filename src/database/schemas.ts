import mongoose = require('mongoose');

// guild
export interface guildObject {
    guild: string;
    logChannel: string;
    logs: mongoose.Schema.Types.ObjectId[];
    staff: mongoose.Schema.Types.ObjectId;
    webhooks: {
        // key is service name
        [key: string]: mongoose.Schema.Types.ObjectId[];
    }
}
export interface guildDoc extends mongoose.Document, guildObject { }
export const guildSchema = new mongoose.Schema({
    guild: String,
    logChannel: String,
    logs: [mongoose.Schema.Types.ObjectId],
    staff: mongoose.Schema.Types.ObjectId,
    webhooks: {
        youtube: [mongoose.Schema.Types.ObjectId]
    }
});

// staff
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

// prefix
export interface prefixObject {
    guild: string;
    prefix: string;
}
export interface prefixDoc extends mongoose.Document, prefixObject { }
export const prefixSchema = new mongoose.Schema({
    guild: String,
    prefix: String
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
    info?: logStaff | logWebhook | logFilter | logCommand | logPrefix;
}
export interface logDoc extends mongoose.Document, logObject { }
export const logSchema = new mongoose.Schema({
    guild: String,
    action: Number,
    mod: String,
    timestamp: Number,
    info: mongoose.Schema.Types.Mixed
});

// types
export const LOG_TYPE_ADD = 0;
export const LOG_TYPE_REMOVE = 1;
export const LOG_TYPE_CHANGE = 2;

// actions
export const LOG_ACTION_STAFF = 0;
export const LOG_ACTION_WEBHOOK = 1;
export const LOG_ACTION_FILTER = 2; // filter catch won't get logged in logs
export const LOG_ACTION_COMMAND = 3;
export const LOG_ACTION_PREFIX = 4;

export interface logStaff {
    type: 0 | 1; // add or remove
    rank: 'admins' | 'mods' | 'immune';
    role?: string; // role id
    user?: string; // user id
}

export interface logWebhook {
    type: 0 | 1 | 2; // add, remove or change
    service: string; // service name
    webhookID: string; // doc id
    changedChannel?: boolean; // if channel was changed
    changedMessage?: boolean; // if message was changed
}

export interface logFilter {
    type: 0 | 1; // add, remove or change
    filter: string; // filter name
}

export interface logCommand {
    type: 0 | 1; // add, remove or change
    command: string; // command name
}

export interface logPrefix {
    old: string,
    new: string
}

// command cache
export interface commandCacheObject {
    guild: string;
    member: string;
    cache: any;
    delete: number;
}
export interface commandCacheDoc extends mongoose.Document, commandCacheObject { }
export const commandCacheSchema = new mongoose.Schema({
    guild: String,
    member: String,
    cache: mongoose.Schema.Types.Mixed,
    delete: Number
});


export interface mStatsObject {
    messagesRecieved: number; // all messages recieved
    messagesSend: number; // all messages send
    logs: number; // total logs created
    guildsJoined: number;
    guildsLeft: number;
    guildsTotal: number;
    errorsTotal: number;
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
}
const mStatsSchemaStruc = {
    messagesRecieved: Number,
    messagesSend: Number,
    logs: Number,
    guildsJoined: Number,
    guildsLeft: Number,
    guildsTotal: Number,
    errorsTotal: Number,
    commandTotal: Number,
    commands: mongoose.Schema.Types.Mixed,
    filters: mongoose.Schema.Types.Mixed,
    webhooks: mongoose.Schema.Types.Mixed,
    ping: {
        clientAPI: Number,
        cluster: Number
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
export var mStatsHourSchemaStruc: any = mStatsSchemaStruc;
mStatsHourSchemaStruc.day = Number;
mStatsHourSchemaStruc.hour = Number;
export const mStatsHourSchema = new mongoose.Schema(mStatsHourSchemaStruc);

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
    defaultEmbedColor: number;
    helpEmbedColor: number;
    callbackURL: string;
    callbackPort: number;
    botMasters: [string];
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
    }
}
export interface globalSettingsDoc extends mongoose.Document, globalSettingsObject { }
export const globalSettingsSchema = new mongoose.Schema({
    prefix: String,
    defaultEmbedColor: Number,
    helpEmbedColor: Number,
    callbackURL: String,
    callbackPort: Number,
    botMasters: [String],
    commands: mongoose.Schema.Types.Mixed,
    filters: mongoose.Schema.Types.Mixed
});