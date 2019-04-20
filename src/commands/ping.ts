import { Message, RichEmbed, Guild } from "discord.js";
import { commandInterface } from "../commands";
import { MEMBER } from "../utils/permissions";
import { Bot } from "..";
import { sendError } from "../utils/messages";
import { permToString } from "../utils/parsers";

var command: commandInterface = { name: null, path: null, dm: null, permLevel: null, shortHelp: null, embedHelp: null, run: null };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        Bot.mStats.logResponseTime(command.name, requestTimestamp);
        const m: any = await message.channel.send("Ping?");
        m.edit(`Pong! \`${m.createdTimestamp - message.createdTimestamp}ms\``);
        Bot.mStats.logCommandUsage(command.name);
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = "ping";
command.path = "";
command.dm = true;
command.permLevel = MEMBER;
command.shortHelp = "check bots responsiveness";
command.embedHelp = async function (guild: Guild) {
    var prefix = Bot.database.getPrefix(guild.id);
    return {
        "embed": {
            "color": Bot.database.settingsDB.cache.helpEmbedColor,
            "author": {
                "name": "Command: " + prefix + command.name
            },
            "fields": [
                {
                    "name": "Description:",
                    "value": "let's you see if bot is responsive"
                },
                {
                    "name": "Need to be:",
                    "value": permToString(command.permLevel),
                    "inline": true
                },
                {
                    "name": "DM capable:",
                    "value": command.dm,
                    "inline": true
                },
                {
                    "name": "Usage:",
                    "value": "{command}".replace(/\{command\}/g, prefix + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command}".replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;