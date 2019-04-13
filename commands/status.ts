import { BOTMASTER, MEMBER } from "../utils/permissions";
import { bot } from "..";
import utils from "../utils";
import { Message, RichEmbed } from "discord.js";
import { command as commandInterface } from "../commands";
import { Connection } from "mongoose";

async function getConnectionStatus(connection:Connection){
    switch(connection.readyState){
        case 0:
        return "disconnected";
        case 1:
        var output = "connected\n";
        var date = new Date()
        var ping = date.getTime();
        await connection.db.admin().command({setParameter: 1, internalQueryExecMaxBlockingSortBytes: 268435456});
        output += `\`${date.getTime()-ping}ms\``;
        return output;
        case 2:
        return "connecting";
        case 3:
        return "disconnecting";
    }
}

var command: commandInterface = { name: null, path: null, dm: null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };

command.run = async (bot: bot, message: Message, args: string, permissionLevel: number) => {
    try {
        const m = await message.channel.send("pong");
        m.edit({
            "embed": {
              "color": bot.database.getGlobalSettings().defaultEmbedColor,
              "timestamp": new Date().toISOString(),
              "author": {
                "name": "BulletBot Status",
                "icon_url": bot.client.user.avatarURL
              },
              "fields": [
                {
                  "name": "Ping:",
                  "value": `\`${m.createdTimestamp - message.createdTimestamp}ms\``,
                  "inline": true
                },
                {
                  "name": "Client API:",
                  "value": `\`${Math.round(bot.client.ping)}ms\``,
                  "inline": true
                },
                {
                  "name": "Main Database:",
                  "value": await getConnectionStatus(bot.database.mainDB.connection),
                  "inline": true
                },
                {
                  "name": "Webhook Database:",
                  "value": await getConnectionStatus(bot.database.webhookDB.connection),
                  "inline": true
                },
                {
                  "name": "MStat Database:",
                  "value": await getConnectionStatus(bot.mStatistics.connection),
                  "inline": true
                },
                {
                  "name": "Evan:",
                  "value": "Dead",
                  "inline": true
                }
              ]
            }
          });
        bot.mStatistics.logCommandUsage(command.name);
    } catch (e) {
        bot.error(message, e);
    }
}

command.name = "status";
command.path = "";
command.dm = true;
command.permissionLevel = BOTMASTER;
command.shortHelp = "gives bot status";
command.embedHelp = function (bot: bot) {
    return {
        "embed": {
            "color": bot.database.getGlobalSettings().helpEmbedColor,
            "author": {
                "name": "Command: " + bot.database.getPrefix() + command.name
            },
            "fields": [
                {
                    "name": "Description:",
                    "value": "gives status of different parts of the bot"
                },
                {
                    "name": "Need to be:",
                    "value": utils.permissions.permToString(command.permissionLevel),
                    "inline": true
                },
                {
                    "name": "DM capable:",
                    "value": command.dm,
                    "inline": true
                },
                {
                    "name": "Usage:",
                    "value": "{command}".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command}".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                }
            ]
        }
    }
};

export default command;