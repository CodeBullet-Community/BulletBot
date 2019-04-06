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
    if(message.content == "test"){
        console.log("adding guild");
        bot.database.addGuild(message.guild).then((guildDoc)=>{
            console.log(guildDoc);
        });
    }
    
});

import token = require("./token.json");
bot.client.login(token.token);
