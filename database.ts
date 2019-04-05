import * as mongoose from "mongoose";

// guild 
interface guildInterface extends mongoose.Document {
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

// command settings
interface cmdSetInterface extends mongoose.Document {
    guild: string;
    commands: {
        [key: string]: {
            [key: string]: any;
        };
    };
};
const cmdSetSchema = new mongoose.Schema({
    guild: String,
    commands: mongoose.Schema.Types.Mixed
}, { strict: false });

// filter settings
interface filterSetInterface extends mongoose.Document {
    guild: string;
    filters: {
        [key: string]: {
            [key: string]: any;
        };
    };
};
const filterSetSchema = new mongoose.Schema({
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
        commands: mongoose.Model<cmdSetInterface>;
        filters: mongoose.Model<filterSetInterface>;
        global: mongoose.Model<placeholderInterface>;
    };

    constructor(URI: string) {

    }
}
