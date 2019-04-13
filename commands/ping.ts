import { BOTMASTER, MEMBER } from "../utils/permissions";
import { bot } from "..";
import utils from "../utils";
import { Message, RichEmbed } from "discord.js";
import { command as commandInterface } from "../commands";

var command: commandInterface = { name: null, path: null,dm:null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };


command.run = async (bot: bot, message: Message, args: string, permissionLevel: number) => {
    try {
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! \`${m.createdTimestamp - message.createdTimestamp}ms\``);
        bot.mStatistics.logCommandUsage(command.name);
    } catch (e) {
        bot.error(message, e);
    }
}

command.name = "ping";
command.path = "";
command.dm = true;
command.permissionLevel = MEMBER;
command.shortHelp = "returns pong";
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
                    "value": "let's you see if bot is responsive"
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