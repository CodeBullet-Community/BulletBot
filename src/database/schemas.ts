import mongoose = require('mongoose');
import { PresenceData, DMChannel, GroupDMChannel, TextChannel, User } from 'discord.js';
import { Bot } from '..';

// guild
export interface guildObject {
    guild: string;
    logChannel: string;
    caseChannel: string;
    totalCases: number;
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
    caseChannel: String,
    totalCases: Number,
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
    command: string;
    cache: any;
    delete: number;
    doc: commandCacheDoc;
    /**
     * Creates an instance of CommandCache with either a new commandCache or with a existing commandCache. When creating a new commandCache, it won't check if one already exists
     * @param {commandCacheDoc} commandCacheDoc existing command cache doc
     * @param {string} [channel] channel for new command cache
     * @param {string} [user] user for new command cache
     * @param {string} [command] name of command
     * @param {number} [cacheTime] time until it gets deleted in ms
     * @param {*} [cache={}] optional cache that should be set
     * @memberof CommandCache
     */
    constructor(commandCacheDoc: commandCacheDoc, channel?: DMChannel | GroupDMChannel | TextChannel, user?: User, command?: string, cacheTime?: number, cache: any = {}) {
        if (commandCacheDoc) {
            this.doc = commandCacheDoc;
            var commandCacheObject: commandCacheObject = commandCacheDoc.toObject();

            //@ts-ignore
            this.channel = Bot.client.channels.get(commandCacheObject.channel);
            Bot.client.fetchUser(commandCacheObject.user).then(user => this.user);
            this.command = commandCacheObject.command;
            this.cache = commandCacheObject.cache;
            this.delete = commandCacheObject.delete;
        } else {
            this.delete = Date.now() + cacheTime
            this.channel = channel;
            this.user = user;
            this.command = command;
            this.cache = cache;

            this.doc = new Bot.database.mainDB.commandCache({
                channel: channel.id,
                user: user.id,
                command: command,
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

// user
export interface userObject {
    user: string; // user id
    commandCooldown: {
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
    commandCooldown: mongoose.Schema.Types.Mixed
});
/**
 * Wrapper for user doc/object. Provides additional functions and easier data handling
 *
 * @export
 * @class UserWrapper
 */
export class UserWrapper {
    user: User;
    commandCooldown: {
        // guild id, 'dm' and 'global'
        [key: string]: {
            // command name
            [key: string]: number; // timestamp until it can be reused again
        };
    };
    doc: userDoc;

    /**
     * Creates an instance of UserWrapper with either a existing user doc or a new one (will create one). If userDoc isn't defined it will create one using user. 
     * If both are defined, it will use the exiting, but not manually fetch the user using the user id. 
     * Also the user in the existing doc won't change if there is a different user.
     * 
     * @param {userDoc} userDoc existing user doc
     * @param {User} [user] user for either new doc or existing one
     * @memberof UserWrapper
     */
    constructor(userDoc: userDoc, user?: User) {
        this.user = user;
        if (userDoc) {
            this.doc = userDoc;
            var userObject: userObject = this.doc.toObject();
            if (!this.user)
                Bot.client.fetchUser(userObject.user).then(user => this.user)
            this.commandCooldown = userObject.commandCooldown;
        } else {
            if (!user) throw new Error("Both userDoc and user weren't specified");

            this.commandCooldown = {};
            this.doc = new Bot.database.mainDB.users({ user: user.id, commandCooldown: {} });
        }
    }

    /**
     * saves changes to doc
     *
     * @returns
     * @memberof UserWrapper
     */
    save() {
        this.doc.commandCooldown = this.commandCooldown;
        this.doc.markModified('commandCooldown');
        return this.doc.save();
    }

    /**
     * deletes doc from database
     *
     * @returns
     * @memberof UserWrapper
     */
    remove() {
        return this.doc.remove();
    }

    /**
     * returns the cooldown timestamp of a command. Returns 0 when no cooldown was specified.
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} command command name
     * @returns timestamp, when the command will be useable again
     * @memberof UserWrapper
     */
    getCooldown(scope: string, command: string) {
        if (!this.commandCooldown || !this.commandCooldown[scope] || !this.commandCooldown[scope][command])
            return 0;
        return this.commandCooldown[scope][command];
    }

    /**
     * sets the cooldown timestamp of a specific command in a specific scope. If save is true (default) it will also save it to the database. 
     * The save function here more efficient then calling save() afterwards.
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} command command name 
     * @param {number} timestamp timestamp, when the command will be useable again
     * @param {boolean} [save=true] if it should save the changes to the database
     * @returns the changed user doc if save is true
     * @memberof UserWrapper
     */
    setCooldown(scope: string, command: string, timestamp: number, save: boolean = true) {
        if (isNaN(Number(scope)) && scope != 'dm' && scope != 'global')
            throw new Error("scope should be guild id, 'dm' or 'global' but is '" + scope + "'");

        if (!this.commandCooldown) this.commandCooldown = {}
        if (!this.commandCooldown[scope]) this.commandCooldown[scope] = {};
        if (timestamp) {
            this.commandCooldown[scope][command] = timestamp;
        } else {
            delete this.commandCooldown[scope][command];
        }

        if (save) {
            this.doc.commandCooldown = this.commandCooldown;
            this.doc.markModified(`commandCooldown.${scope}.${command}`);
            return this.doc.save();
        }
    }

    /**
     * deleted the cooldown infos of a specific command. Saves changes to database if save is true (default)
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {boolean} [save=true] if it should save the changes to the database
     * @returns the changed user doc if something was changed and save is true
     * @memberof UserWrapper
     */
    resetCooldown(scope: string, save: boolean = true) {
        if (!this.commandCooldown[scope]) return;
        delete this.commandCooldown[scope];
        if (save) {
            this.doc.commandCooldown = this.commandCooldown;
            this.doc.markModified('commandCooldown');
            return this.doc.save();
        }
    }
}

// megalog settings
export interface megalogObject {
    guild: string; // guild id
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
    overwrites: string[];
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
    embedColors: {
        default: number;
        help: number;
        neutral: number;
        negative: number;
        warn: number;
        positive: number;
    };
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
    filters: mongoose.Schema.Types.Mixed
});