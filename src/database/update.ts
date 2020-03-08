import { Snowflake } from 'discord.js';
import mongoose = require('mongoose');

import { cluster } from '../bot-config.json';
import { ExDocument } from './schemas/global.js';
import { GuildObject, guildSchema } from './schemas/main/guild.js';
import { UserObject, userSchema } from './schemas/main/user.js';

// guild
interface OldGuildObject extends GuildObject {
    guild?: Snowflake
}
type OldGuildDoc = ExDocument<OldGuildObject>;

// prefix
interface prefixObject {
    guild: string;
    prefix: string;
}
type prefixDoc = ExDocument<prefixObject>;
const prefixSchema = new mongoose.Schema({
    guild: String,
    prefix: String
});

// staff
interface staffObject {
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
type staffDoc = ExDocument<staffObject>;
const staffSchema = new mongoose.Schema({
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
interface commandsObject {
    guild: string;
    commands: {
        // key is command name
        [key: string]: {
            _enabled: boolean;
            [key: string]: any;
        }
    }
}
type commandsDoc = ExDocument<commandsObject>;
const commandsSchema = new mongoose.Schema({
    guild: String,
    commands: mongoose.Schema.Types.Mixed
});

// megalog settings
interface megalogObject {
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
interface megalogDoc extends mongoose.Document, megalogObject { }
const megalogSchema = new mongoose.Schema({
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

// user
type OldUserObject = UserObject & {
    user: string;
}
type OldUserDoc = ExDocument<OldUserObject>;

export async function updateDatabaseAfter1_2_8() {
    console.info('Database changes for this update will be applied.');

    let mainCon = await mongoose.createConnection(cluster.url + '/main' + cluster.suffix, { useNewUrlParser: true });

    let guildCollection: mongoose.Model<OldGuildDoc> = mainCon.model('guild', guildSchema, 'guilds');

    let prefixCollection: mongoose.Model<prefixDoc> = mainCon.model('prefix', prefixSchema, 'prefix');
    let staffCollection: mongoose.Model<staffDoc> = mainCon.model('staff', staffSchema, 'staff');
    let commandsCollection: mongoose.Model<commandsDoc> = mainCon.model('commands', commandsSchema, 'commands');
    let megalogCollection: mongoose.Model<megalogDoc> = mainCon.model('megalogSettings', megalogSchema, 'megalogs');

    let guildDocs: OldGuildDoc[] = await guildCollection.find().exec();
    for (const guildDoc of guildDocs) {
        guildDoc.id = guildDoc.guild;
        delete guildDoc.guild;

        let prefixDoc = await prefixCollection.findOne({ guild: guildDoc.id }).exec();
        if (prefixDoc) guildDoc.prefix = prefixDoc.prefix;

        let staffDoc = await staffCollection.findOne({ guild: guildDoc.id }).exec();
        if (staffDoc)
            guildDoc.ranks = {
                admins: [...staffDoc.admins.users, ...staffDoc.admins.roles],
                mods: [...staffDoc.mods.users, ...staffDoc.mods.roles],
                immune: [...staffDoc.immune.users, ...staffDoc.immune.roles]
            };

        let commandsDoc = await commandsCollection.findOne({ guild: guildDoc.id }).exec();
        if (commandsDoc)
            guildDoc.commandSettings = commandsDoc.commands;
        else if (!guildDoc.commandSettings)
            guildDoc.commandSettings = {};

        let megalogDoc = await megalogCollection.findOne({ guild: guildDoc.id }).exec();
        if (megalogDoc) {
            let megalogObj: megalogObject = megalogDoc.toObject({ versionKey: false });
            delete megalogObj.guild;
            guildDoc.megalog = megalogObj;
        }
        guildDoc.save();
    }

    let userCollection: mongoose.Model<OldUserDoc> = mainCon.model('user', userSchema, 'users');

    await userCollection.update({}, { $rename: { user: 'id' } }).exec();

    for (const name of ['prefix', 'staff', 'commands', 'megalogs'])
        try {
            await mainCon.dropCollection(name);
        } catch{ }
    console.info('Database was successfully updated');
}