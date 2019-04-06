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
    commands: "",
    filters: "",
    general: ""
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
    };

    findGuild(guild: Guild){
        var query = this.mainDB.guilds.findOne({guild:guild.id});
        return query.exec();
    }

    async addGuild(guild:Guild) {
        var guildDoc = await this.findGuild(guild);
        if(guildDoc){
            return guildDoc.toObject();
        }
        guildDoc = new this.mainDB.guilds();
        guildDoc.guild = guild.id;
        guildDoc.save();
        return guildDoc.toObject();
    };

}
