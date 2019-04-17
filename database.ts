import mongoose = require("mongoose");
import { Guild, Channel, GuildMember } from "discord.js";
import { filterAction } from "./utils/filters";
import { bot } from ".";
import Catcher from "./catcher";

// guild 
interface guildInterface extends mongoose.Document {
    guild: string;
    staff: {
        mods: {
            roles: string[];
            users: string[];
        };
        admins: {
            roles: string[];
            users: string[];
        }
    };
    logChannel: string;
    webhooks: {
        [key: string]: string[];
    }
};
const guildSchema = new mongoose.Schema({
    guild: String,
    staff: {
        mods: {
            roles: [String],
            users: [String]
        },
        admins: {
            roles: [String],
            users: [String]
        }
    },
    logChannel: String,
    webhooks: {
        youtube: [String]
    }
});


// log actions
export const LOG_TYPE_ADD = 0;
export const LOG_TYPE_REMOVE = 1;
export const LOG_TYPE_CHANGE = 2;

export const LOG_ADMIN_CHANGE = 0;
export const LOG_MOD_CHANGE = 1;
export interface StaffChange {
    type: 0 | 1;
    role?: string;
    user?: string;
}
export const LOG_LOG_CHANNEL = 2;
export interface logChannelChange {
    type: 0 | 1;
    channel: string;
}
export const LOG_WEBHOOK = 3;
export interface webhookChange {
    type: 0 | 1 | 2;
    service: string;
    feed: string;
    channel: string;
    newChannel?: string;
    newFeed?: string;
    newMessage?: boolean;
}
export const LOG_FILTER = 4;
export interface filterChange {
    type: 0 | 1;
    filter: string;
    channel?: string;
}
export const LOG_FILTER_CATCH = 5;
export interface filterCatch {
    filter: string;
    user: string;
    channel: string;
    actions: filterAction[];
}
// log
interface logInterface extends mongoose.Document {
    guild: string;
    action: Number;
    mod: string;
    timestamp: number;
    info: {
        [key: string]: any;
    };
};
const logSchema = new mongoose.Schema({
    guild: String,
    action: Number,
    mod: String,
    timestamp: Number,
    info: mongoose.Schema.Types.Mixed
});

// commands settings
interface commandsInterface extends mongoose.Document {
    guild: string;
    commands: {
        [key: string]: {
            [key: string]: any;
        };
    };
};
const commandsSchema = new mongoose.Schema({
    guild: String,
    commands: mongoose.Schema.Types.Mixed
}, { strict: false });

// filter settings
interface filtersInterface extends mongoose.Document {
    guild: string;
    filters: {
        [key: string]: {
            [key: string]: any;
        };
    };
};
const filtersSchema = new mongoose.Schema({
    guild: String,
    filters: mongoose.Schema.Types.Mixed
}, { strict: false });

// webhook
export interface webhookInterface extends mongoose.Document {
    feed: string;
    guild: string;
    channel: string;
    message: string;
};
const webhookSchema = new mongoose.Schema({
    feed: String,
    guild: String,
    channel: String,
    message: String
})

// placeholder
interface placeholderInterface extends mongoose.Document {
    [key: string]: any;
};
const placeholderSchema = new mongoose.Schema({}, { strict: false });

const GLOBAL = {
    commands: "5ca889e805bac8342004ff6f",
    filters: "5ca889ef05bac8342004ff70",
    general: "5ca8896005bac8342004ff6e"
};

export class Database {
    mainDB: {
        connection: mongoose.Connection;
        guilds: mongoose.Model<guildInterface>;
        logs: mongoose.Model<logInterface>;
        commands: mongoose.Model<commandsInterface>;
        filters: mongoose.Model<filtersInterface>;
        settings: mongoose.Model<placeholderInterface>;
    };
    webhookDB: {
        connection: mongoose.Connection;
        youtube: mongoose.Model<webhookInterface>;
    };
    cache: {
        general: any;
        commands: any;
        filters: any;
    };
    bot: bot;

    /** manages connections to databases */
    constructor(bot: bot, URI: string) {
        this.bot = bot;
        var mainConnection = mongoose.createConnection(URI + "/main?authSource=admin", { useNewUrlParser: true });
        mainConnection.on('error', console.error.bind(console, 'connection error:'));
        mainConnection.once('open', function () {
            console.log("connected to " + URI + "/main?authSource=admin")
        });
        // TODO: define logs
        this.mainDB = {
            connection: mainConnection,
            guilds: mainConnection.model("guild", guildSchema, "guilds"),
            logs: mainConnection.model("log", logSchema, "logs"),
            commands: mainConnection.model("commands", commandsSchema, "commands"),
            filters: mainConnection.model("filters", filtersSchema, "filters"),
            settings: mainConnection.model("setting", placeholderSchema, "settings")
        };

        var webhookConnection = mongoose.createConnection(URI + "/webhooks?authSource=admin", { useNewUrlParser: true });
        webhookConnection.on('error', console.error.bind(console, 'connection error:'));
        webhookConnection.once('open', function () {
            console.log("connected to " + URI + "/webhooks?authSource=admin");
        });
        this.webhookDB = {
            connection: webhookConnection,
            youtube: webhookConnection.model("webhook", webhookSchema, "youtube")
        };

        this.updateGlobalSettings();
    }

    /** updates cached global settings */
    async updateGlobalSettings() {
        var general = await this.mainDB.settings.findById(GLOBAL.general);
        var commands = await this.mainDB.settings.findById(GLOBAL.commands);
        var filters = await this.mainDB.settings.findById(GLOBAL.filters);
        var oldPort: number;
        if (this.cache) oldPort = this.cache.general.callbackPort;
        this.cache = {
            general: general.toObject(),
            commands: commands.toObject(),
            filters: filters.toObject()
        }
        if (oldPort && this.bot.catcher && oldPort != this.cache.general.callbackPort) {
            this.bot.catcher.close();
            this.bot.catcher = new Catcher(this.bot, this.cache.general.callbackPort);
        }
    }

    /** returns chached global general settings */
    getGlobalSettings() {
        return this.cache.general;
    }

    /** returns default prefix */
    getPrefix(): string {
        return this.cache.general.prefix;
    }

    /** returns array of bot masters */
    getBotMasters(): string[] {
        return this.cache.general.botMasters;
    }

    /** returns global command settings if exist else null */
    getGlobalCommandSettings(command: string) {
        if (command in this.cache.commands) return this.cache.commands[command];
        return null;
    }

    /** returns global filter settings if exist else null */
    getGlobalFilterSettings(filter: string) {
        if (filter in this.cache.filters) return this.cache.filters[filter];
        return null;
    }

    /** find Guild Doc */
    findGuildDoc(guildId: string) {
        return this.mainDB.guilds.findOne({ guild: guildId }).exec();
    }

    /** adds initial Guild Doc if there isn't one */
    async addGuild(guildId: string) {
        var guildDoc = await this.findGuildDoc(guildId);
        if (guildDoc) {
            return guildDoc;
        }
        guildDoc = new this.mainDB.guilds();
        guildDoc.guild = guildId;
        guildDoc.save();
        return guildDoc;
    };

    /** removes all objects related to guild */
    async removeGuild(guild: Guild) {
        // TODO: remove logs
        var guildDoc = await this.findGuildDoc(guild.id);
        var webhooks = guildDoc.toObject().webhooks;
        if (guildDoc) guildDoc.remove();
        var commandDoc = await this.findCommandsDoc(guild);
        if (commandDoc) commandDoc.remove();
        var filterDoc = await this.findFiltersDoc(guild);
        if (filterDoc) filterDoc.remove();
        for (const service in webhooks) {
            for (const webhookDocId of webhooks[service]) {
                this.webhookDB[service].remove({ _id: webhookDocId });
            }
        }
    }

    /** find commands doc */
    findCommandsDoc(guild: Guild) {
        return this.mainDB.commands.findOne({ guild: guild.id }).exec();
    }

    /** gets guild specific command settings of certain command*/
    async getCommandSettings(guild: Guild, command: string, doc?: commandsInterface) {
        // if the doc isn't null, but it got deleted in the DB it will always return null
        var commandSettings = doc;
        if (!commandSettings || commandSettings.guild != guild.id)
            commandSettings = await this.findCommandsDoc(guild);
        if (!commandSettings) return null;
        commandSettings = commandSettings.toObject().commands
        if (command in commandSettings) return commandSettings[command];
        return null;
    }

    /** sets settings of specific command in a guild */
    async setCommandSettings(guild: Guild, command: string, settings, doc?: commandsInterface) {
        // if the doc isn't null, but it got deleted in the DB it won't change anything
        var cmdDoc = doc;
        if (!cmdDoc || doc.guild != guild.id) {
            cmdDoc = await this.findCommandsDoc(guild);
        }
        if (!cmdDoc) {
            cmdDoc = new this.mainDB.commands();
            cmdDoc.guild = guild.id;
            cmdDoc.commands = {};
        }
        cmdDoc.commands[command] = settings;
        cmdDoc.markModified('commands.' + command);
        return await cmdDoc.save();
    }

    /** find filters doc */
    findFiltersDoc(guild: Guild) {
        return this.mainDB.filters.findOne({ guild: guild.id }).exec();
    }

    /** gets guild specific filter settings of certain filter*/
    async getFilterSettings(guild: Guild, filter: string, doc?: filtersInterface) {
        // if the doc isn't null, but it got deleted in the DB it will always return null
        var filterSettings = doc;
        if (!filterSettings || filterSettings.guild != guild.id) filterSettings = await this.findFiltersDoc(guild);
        if (!filterSettings) return null;
        filterSettings = filterSettings.toObject().filters
        if (filter in filterSettings) return filterSettings[filter];
        return null;
    }

    /** sets settings of specific filter in a guild */
    async setFilterSettings(guild: Guild, filter: string, settings, doc?: filtersInterface) {
        // if the doc isn't null, but it got deleted in the DB it won't change anything
        var filterDoc = doc;
        if (!filterDoc || doc.guild != guild.id) {
            filterDoc = await this.findFiltersDoc(guild);
        }
        if (!filterDoc) {
            filterDoc = new this.mainDB.filters();
            filterDoc.guild = guild.id;
            filterDoc.filters = {};
        }
        filterDoc.filters[filter] = settings;
        filterDoc.markModified('filters.' + filter);
        return await filterDoc.save();
    }

    /** creates webhook doc with specific values */
    async createWebhook(guild: Guild, channel: Channel, service: string, feed: string, message: string) {
        if (this.webhookDB[service] instanceof mongoose.Model) {
            console.warn("unknown service input in createWebhook()");
            return;
        }
        var webhookDoc: webhookInterface = new this.webhookDB[service]({
            feed: feed,
            guild: guild.id,
            channel: channel.id,
            message: message
        });
        webhookDoc.save();
        var guildDoc = await this.findGuildDoc(guild.id);
        if (!guildDoc) {
            console.warn("no guildDoc found in createWebhook(). Creating one");
            guildDoc = await this.addGuild(guild.id);
        }
        guildDoc.webhooks[service].push(webhookDoc._id);
        guildDoc.save();
        return webhookDoc;
    }

    /** deletes webhook doc using id and service and then returns the content */
    async deleteWebhook(service: string, id: string):
        Promise<{ feed: string, guild: string, channel: string, message: string }> {
        if (this.webhookDB[service] instanceof mongoose.Model) {
            console.warn("unknown service input in deleteWebhook()");
            return;
        }
        var webhookDoc: webhookInterface = await this.webhookDB[service].findById(id).exec();
        if (!webhookDoc) return;
        var webhookObject = webhookDoc.toObject();
        webhookDoc.remove();
        var update: any = { $pull: {} };
        update.$pull["webhooks." + service] = id;
        await this.mainDB.guilds.findOneAndUpdate({ guild: webhookObject.guild }, update);
        return webhookObject;
    }

    /** finds webhook doc with certain attributes */
    async findWebhook(guild: Guild, channel: Channel, service: string, feed: string): Promise<webhookInterface> {
        if (this.webhookDB[service] instanceof mongoose.Model) {
            console.warn("unknown service input in findWebhook()");
            return;
        }
        return await this.webhookDB[service].findOne({
            feed: feed,
            guild: guild.id,
            channel: channel.id
        });
    }

    /** logs action in database */
    log(guild: Guild, mod: GuildMember, action: 0 | 1 | 2 | 3 | 4 | 5,
        info: StaffChange | logChannelChange | webhookChange | filterChange | filterCatch) {
        var logDoc = new this.mainDB.logs();
        logDoc.guild = guild.id;
        logDoc.action = action;
        logDoc.mod = mod.id;
        logDoc.timestamp = new Date().getTime();
        logDoc.info = info;
        logDoc.markModified("info");
        return logDoc.save();
    }

}
