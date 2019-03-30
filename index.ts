import * as discord from "discord.js";
import commands from "./commands";
import filters from "./filters";
import webhooks from "./webhooks";
import utils from "./utils";

interface botInterface {
    client: discord.Client;
    commands: commands;
    filters: filters;
    webhooks: webhooks;
    utils: utils;
}

var bot:botInterface = {
    client: new discord.Client(),
    commands: new commands(),
    filters: new filters(),
    webhooks: new webhooks(),
    utils: new utils()
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