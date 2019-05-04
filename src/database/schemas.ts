import mongoose = require('mongoose');
import { PresenceData, DMChannel, GroupDMChannel, TextChannel, User } from 'discord.js';
import { Bot } from '..';

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
    prefix = 4
}

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
    channel: string;
    user: string;
    cache: any;
    delete: number;
}
export interface commandCacheDoc extends mongoose.Document, commandCacheObject { }
export const commandCacheSchema = new mongoose.Schema({
    channel: String,
    user: String,
    cache: mongoose.Schema.Types.Mixed,
    delete: Number
});
/**
 * Wrapper from command cache. Is a mix between doc and object
 *
 * @export
 * @class CommandCache
 * @implements {commandCacheObject}
 */
export class CommandCache {
    channel: DMChannel | GroupDMChannel | TextChannel;
    user: User;
    cache: any;
    delete: number;
    doc: commandCacheDoc;
    /**
     * Creates an instance of CommandCache with either a new commandCache or with a existing commandCache. When creating a new commandCache, it won't check if one already exists
     * @param {commandCacheDoc} commandCacheDoc existing command cache doc
     * @param {string} [channel] channel for new command cache
     * @param {string} [user] user for new command cache
     * @param {number} [cacheTime] time until it gets deleted in ms
     * @param {*} [cache={}] optional cache that should be set
     * @memberof CommandCache
     */
    constructor(commandCacheDoc: commandCacheDoc, channel?: DMChannel | GroupDMChannel | TextChannel, user?: User, cacheTime?: number, cache: any = {}) {
        if (commandCacheDoc) {
            this.doc = commandCacheDoc;
            var commandCacheObject: commandCacheObject = commandCacheDoc.toObject();
            
            //@ts-ignore
            this.channel = Bot.client.channels.get(commandCacheObject.channel);
            Bot.client.fetchUser(commandCacheObject.user).then(user => this.user);
            this.cache = commandCacheObject.cache;
            this.delete = commandCacheObject.delete;
        } else {
            this.delete = Date.now() + cacheTime
            this.channel = channel;
            this.user = user;
            this.cache = cache;

            this.doc = new Bot.database.mainDB.commandCache({
                channel: channel.id,
                user: user.id,
                cache: cache,
                delete: this.delete
            });
            this.doc.save();
        }
    }

    /**
     * saves cache to new 
     *
     * @param {number} [newCacheTime] if set, will reset the delete timestamp to a new date
     * @returns
     * @memberof CommandCache
     */
    save(newCacheTime?: number) {
        this.doc.cache = this.cache;
        this.doc.markModified('cache');
        if (newCacheTime)
            this.doc.delete = Date.now() + newCacheTime;
        return this.doc.save()
    }

    /**
     * deletes doc from database
     *
     * @returns
     * @memberof CommandCache
     */
    remove() {
        return this.doc.remove()
    }

}


export interface mStatsObject {
    messagesReceived: number; // all messages recieved
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
    messagesReceived: Number,
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
})

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
    defaultEmbedColor: number;
    helpEmbedColor: number;
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
    presence: {
        status: { type: String, required: false },
        afk: { type: Boolean, required: false },
        game: {
            name: { type: String, required: false },
            url: { type: String, required: false },
            type: { type: String, required: false }
        }
    },
    defaultEmbedColor: Number,
    helpEmbedColor: Number,
    botMasters: [String],
    commands: mongoose.Schema.Types.Mixed,
    filters: mongoose.Schema.Types.Mixed
});