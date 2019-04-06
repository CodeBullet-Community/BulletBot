import mongoose = require("mongoose");
import { Guild } from "discord.js";

// guild 
interface guildInterface extends mongoose.Document {
    guild: string;
    staff: {
        mods: {
            roles: { [index: number]: string };
            users: { [index: number]: string };
        };
        admins: {
            roles: { [index: number]: string };
            users: { [index: number]: string };
        }
    };
    logChannel: string;
    webhooks: {
        [key: string]: { [index: number]: string };
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

// log
// undefined for now
interface logInterface extends mongoose.Document {
    guild: string;
    action: string;
};

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
interface webhookInterface extends mongoose.Document {
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
    }

    /** manages connections to databases */
    constructor(URI: string) {
        var mainConnection = mongoose.createConnection(URI + "/main", { useNewUrlParser: true });
        mainConnection.on('error', console.error.bind(console, 'connection error:'));
        mainConnection.once('open', function () {
            console.log("connected to " + URI + "/main")
        });
        // TODO: define logs
        this.mainDB = {
            connection: mainConnection,
            guilds: mainConnection.model("guild", guildSchema, "guilds"),
            logs: null,
            commands: mainConnection.model("commands", commandsSchema, "commands"),
            filters: mainConnection.model("filters", filtersSchema, "filters"),
            settings: mainConnection.model("setting", placeholderSchema, "settings")
        };

        var webhookConnection = mongoose.createConnection(URI + "/webhooks", { useNewUrlParser: true });
        webhookConnection.on('error', console.error.bind(console, 'connection error:'));
        webhookConnection.once('open', function () {
            console.log("connected to " + URI + "/webhooks");
        });
        this.webhookDB = {
            connection: webhookConnection,
            youtube: webhookConnection.model("webhook", webhookSchema, "youtube")
        };

        this.updateGlobalSettings();
    };

    /** updates cached global settings */
    async updateGlobalSettings() {
        var general = await this.mainDB.settings.findById(GLOBAL.general);
        var commands = await this.mainDB.settings.findById(GLOBAL.commands);
        var filters = await this.mainDB.settings.findById(GLOBAL.filters);
        this.cache = {
            general: general.toObject(),
            commands: commands.toObject(),
            filters: filters.toObject()
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
    findGuildDoc(guild: Guild) {
        return this.mainDB.guilds.findOne({ guild: guild.id }).exec();
    }

    /** adds initial Guild Doc if there isn't one */
    async addGuild(guild: Guild) {
        var guildDoc = await this.findGuildDoc(guild);
        if (guildDoc) {
            return guildDoc.toObject();
        }
        guildDoc = new this.mainDB.guilds();
        guildDoc.guild = guild.id;
        guildDoc.save();
        return guildDoc.toObject();
    };

    /** removes all objects related to guild */
    async removeGuild(guild: Guild) {
        // TODO: remove logs, filters, webhooks
        var guildDoc = await this.findGuildDoc(guild);
        if (!guildDoc) return;
        guildDoc.remove();
        var commandDoc = await this.findCommandsDoc(guild);
        if (!commandDoc) return;
        commandDoc.remove();
    }

    /** find Command Doc */
    findCommandsDoc(guild: Guild) {
        return this.mainDB.commands.findOne({ guild: guild.id }).exec();
    }

    /** gets guild specific command settings of certain command*/
    async getCommandSettings(guild: Guild, command: string, doc?: commandsInterface) {
        // if the doc isn't null, but it got deleted in the DB it will always return null
        var commandSettings = doc;
        if (!commandSettings || commandSettings.guild != guild.id) commandSettings = await this.findCommandsDoc(guild);
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

}
