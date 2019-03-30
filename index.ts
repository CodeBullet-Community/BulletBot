import * as discord from "discord.js";
import commands from "./commands";
import filters from "./filters";
import webhooks from "./webhooks";

interface botInterface {
    client: discord.Client;
    commands: commands;
    filters: filters;
    webhooks: webhooks;
    database: {
        guilds: utils.database.guilds;
        commands: utils.database.commands;
        filters: utils.database.filters;
        webhooks: utils.database.webhooks;
    };
    mStatistics: utils.mStatistics;
}

const bot:botInterface = {
    client: new discord.Client(),
    commands: new commands(),
    filters: new filters(),
    webhooks: new webhooks(),
    database: {
        guilds: new utils.database.guilds(),
        commands: new utils.database.commands(),
        filters: new utils.database.filters(),
        webhooks: new utils.database.webhooks()
    },
    mStatistics: new utils.mStatistics()
};

bot.client.on('ready', () => {
    console.log("Bot is ready");
});

bot.client.on('message', message => {
    if (message.author.bot) return;
    message.channel.send("messages recieved");
});

import token = require("./token.json");
bot.client.login(token.token);