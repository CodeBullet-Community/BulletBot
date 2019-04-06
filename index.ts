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
}

const bot:botInterface = {
    client: new discord.Client(),
    commands: new Commands(),
    filters: new Filters(),
    webhooks: new Webhooks(),
    database: new Database(DBURI),
    mStatistics: new utils.MStatistics()
};

bot.client.on('ready', () => {
    console.log("Bot is ready");
});

bot.client.on('message', message => {
    if (message.author.bot) return;
    message.channel.send("messages recieved");
    switch(message.content){
        case "add":
        console.log("adding guild");
        bot.database.addGuild(message.guild).then((guildDoc)=>{
            console.log(guildDoc);
        });
        break;
        case "remove":
        console.log("removing guild");
        bot.database.removeGuild(message.guild).then(() => {
            console.log("deleted");
        })
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
