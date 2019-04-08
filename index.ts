import * as discord from "discord.js";
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l' });
import Commands from "./commands";
import Filters from "./filters";
import Webhooks from "./webhooks";
import { Database } from "./Database";
import { MStatistics } from "./utils/mStatistics";
import utils from "./utils";

// Database reference gets added in class
const DBURI = "mongodb://localhost";

export interface botInterface {
    client: discord.Client;
    commands: Commands;
    filters: Filters;
    webhooks: Webhooks;
    database: Database;
    mStatistics: MStatistics;
}

const bot: botInterface = {
    client: new discord.Client(),
    commands: new Commands(__dirname+"/commands/"),
    filters: new Filters(),
    webhooks: new Webhooks(),
    database: new Database(DBURI),
    mStatistics: new utils.MStatistics(),
};

var globalUpdate = setInterval(() => {
    bot.database.updateGlobalSettings();
    //console.log("global cache was updated");
}, 60000);

bot.client.on('ready', () => {
    console.info("Bot is ready");
});

bot.client.on('message', async message => {
    if (message.author.bot) return;
    var permissionLevel = await utils.permissions.getPermissionLevel(bot,message.member);
    if (!message.content.startsWith(bot.database.getPrefix())) return;

    var command = message.content.split(" ")[0].slice(bot.database.getPrefix().length).toLowerCase();
    var args = message.content.slice(bot.database.getPrefix().length + command.length + 1);

    bot.commands.runCommand(bot,message,args,command,permissionLevel);
});

bot.client.on('guildCreate', guild => {
    console.log(`joined ${guild.name} with id ${guild.id}`);
    bot.database.addGuild(guild);
});

bot.client.on('guildDelete', guild => {
    console.log(`left ${guild.name} with id ${guild.id}`);
    bot.database.removeGuild(guild);
});

import token = require("./token.json");
bot.client.login(token.token);
