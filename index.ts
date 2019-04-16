import * as discord from "discord.js";
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l' });
import exitHook = require('exit-hook');
import Commands from "./commands";
import Filters from "./filters";
import Webhooks from "./webhooks";
import Catcher from "./catcher";
import { Database } from "./Database";
import { MStatistics } from "./utils/mStatistics";
import utils from "./utils";

// Database reference gets added in class
const DBURI = "mongodb://localhost";

export interface bot {
    client: discord.Client;
    commands: Commands;
    filters: Filters;
    webhooks: Webhooks;
    database: Database;
    mStatistics: MStatistics;
    error: (message: discord.Message, error: any) => void;
}

const bot: bot = {
    client: new discord.Client(),
    commands: new Commands(__dirname + "/commands/"),
    filters: new Filters(__dirname + "/filters/"),
    webhooks: new Webhooks(),
    database: new Database(DBURI),
    mStatistics: new utils.MStatistics(DBURI),
    error: function (message: discord.Message, error: any) {
        message.channel.send("Oops something went wrong. #BlameEvan");
        console.error(error);
    }
};

exitHook(() => {
    console.log('Saving cached data...');
    bot.mStatistics.saveHour(bot.mStatistics.hourly.doc);
    var until = new Date().getTime() + 1000;
    while (until > new Date().getTime()) { }
    console.log("cached data saved");
});

var globalUpdate = setInterval(() => {
    bot.database.updateGlobalSettings();
    //console.log("global cache was updated");
}, 60000);

var catcher:Catcher;

setTimeout(()=>{
    catcher = new Catcher(bot,bot.database.getGlobalSettings().callbackPort);
},2000);

bot.client.on('ready', () => {
    console.info("Bot is ready");
});

bot.client.on('error', error => {
    console.error({ info: "from client.on()", error });
})

bot.client.on('message', async message => {
    if (message.author.bot) return;
    bot.mStatistics.logMessage();
    var dm = false;
    if (!message.guild) {
        dm = true;
    }
    // if message is only a mention of the bot, he dms help
    if (message.content == "<@" + bot.client.user.id + ">") {
        message.author.createDM().then(dmChannel => {
            message.channel = dmChannel;
            bot.commands.runCommand(bot, message, "", "help", 0, dm);
        });
        return;
    }

    var permissionLevel = MEMBER;
    if (!dm) {
        permissionLevel = await utils.permissions.getPermissionLevel(bot, message.member);
    }
    if (!message.content.startsWith(bot.database.getPrefix()) && !dm) {
        if (permissionLevel == MEMBER) {
            bot.filters.filterMessage(bot, message);
        }
        return;
    }

    var command = message.content.split(" ")[0].slice(bot.database.getPrefix().length).toLowerCase();
    var args = message.content.slice(bot.database.getPrefix().length + command.length + 1);

    bot.commands.runCommand(bot, message, args, command, permissionLevel, dm);
});

bot.client.on('guildCreate', guild => {
    console.log(`joined ${guild.name} with id ${guild.id}`);
    bot.database.addGuild(guild.id);
});

bot.client.on('guildDelete', guild => {
    console.log(`left ${guild.name} with id ${guild.id}`);
    bot.database.removeGuild(guild);
});

import token = require("./token.json");
import { MEMBER } from "./utils/permissions";
bot.client.login(token.token);
