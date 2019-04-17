import { BOTMASTER, MEMBER, MOD } from "../../utils/permissions";
import { bot } from "../..";
import utils from "../../utils";
import { Message, TextChannel, Channel, GuildChannel } from "discord.js";
import { command as commandInterface } from "../../commands";
import { stringToChannel, stringToEmbed } from "../../utils/parsers";
import { sendMentionMessage } from "../../utils/messages";

var command: commandInterface = { name: null, path: null, dm: null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };


command.run = async (bot: bot, message: Message, args: string, permissionLevel: number) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(command.embedHelp(bot));
            return;
        }
        var argsArray = args.split(" ").filter(x => x.length != 0);

        var channel: any = stringToChannel(message.guild, argsArray[argIndex]);
        if (!channel) {
            channel = message.channel;
        } else {
            if (message.guild) {
                if (!channel.permissionsFor(message.member).hasPermission("SEND_MESSAGES")) {
                    message.channel.send("You don't have permission to write in " + channel);
                    return;
                }
                if (!channel.permissionsFor(message.guild.me).hasPermission("SEND_MESSAGES")) {
                    message.channel.send("I don't have permission to write in " + channel);
                    return
                }
            }
            if (!channel.send) {
                message.channel.send("I can't write in a voice channel");
                return
            }
            argIndex++;
        }

        var embed = false;
        if (argsArray[argIndex] == "embed") {
            embed = true;
            argIndex++;
        }

        var processedArgs = "";
        for (var i = 0; i < argIndex; i++) {
            processedArgs += argsArray[i] + " ";
        }
        var text = args.slice(processedArgs.length);

        var content = text;
        var embedObject;
        if (embed) {
            embedObject = stringToEmbed(text);
            if (!embedObject) {
                message.channel.send("couldn't parse embed json");
                return;
            }
            content = embedObject.content;
        }

        if (content && content.includes("{{role:")) {
            sendMentionMessage(message.guild, channel, content, embedObject);
        } else {
            channel.send(content, embedObject);
        }

        bot.mStatistics.logCommandUsage(command.name, embed ? "embed" : "normal");
    } catch (e) {
        bot.error(message, e);
    }
}

command.name = "say";
command.path = "";
command.dm = true;
command.permissionLevel = MOD;
command.shortHelp = "let's the bot speak for you";
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
                    "value": "let's you control what bot says\ncan also send embed\nuse [this generator](https://leovoel.github.io/embed-visualizer/) to generate the json text for embed"
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
                    "value": "{command} [channel] [message]\n{command} [channel] embed [embed json]".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command} Hey I'm BulletBot\n{command} #general Hey I'm BulletBot\n{command} #announcement embed [some embed json text]".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                }
            ]
        }
    }
};

export default command;