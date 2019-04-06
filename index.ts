import * as discord from "discord.js";
import Commands from "./commands";
import Filters from "./filters";
import Webhooks from "./webhooks";
import { Database } from "./Database";
import { MStatistics } from "./utils/mStatistics";
import utils from "./utils";

// Database reference gets added in class
const DBURI = "mongodb://localhost";

interface botInterface {
    client: discord.Client;
    commands: Commands;
    filters: Filters;
    webhooks: Webhooks;
    database: Database;
    mStatistics: MStatistics;
    log: Function;
}

const bot: botInterface = {
    client: new discord.Client(),
    commands: new Commands(),
    filters: new Filters(),
    webhooks: new Webhooks(),
    database: new Database(DBURI),
    mStatistics: new utils.MStatistics(),
    log: function (message) {
        console.log(new Date().toISOString() + ": " + message);
    }
};

var globalUpdate = setInterval(() => {
    bot.database.updateGlobalSettings();
    bot.log("global cache was updated");
}, 60000);

bot.client.on('ready', () => {
    console.log("Bot is ready");
});

bot.client.on('message', message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(bot.database.getPrefix())) return;

    var command = message.content.split(" ")[0].slice(bot.database.getPrefix().length).toLowerCase();
    var args = message.content.slice(bot.database.getPrefix().length + command.length + 1);

    switch (command) {
        case "add":
            bot.database.addGuild(message.guild).then((guildDoc) => {
                message.channel.send("added this guild");
            });
            break;
        case "remove":
            bot.database.removeGuild(message.guild).then(() => {
                message.channel.send("removed this guild");
            })
            break;
        case "update":
            bot.database.updateGlobalSettings().then(() => {
                message.channel.send("updated global settings");
            })
        case "setfilter":
            bot.database.setFilterSettings(message.guild, "testfilter", { stuff: "stuff1" }).then(settings => {
                console.log(settings);
            });
            break;
        case "getfilter":
            bot.database.getFilterSettings(message.guild, "testfilter").then(settings => {
                console.log(settings);
            });
            break;
    }
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
