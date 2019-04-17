import { BOTMASTER, MEMBER, ADMIN } from "../../utils/permissions";
import { bot } from "../..";
import utils from "../../utils";
import { Message, RichEmbed } from "discord.js";
import { command as commandInterface } from "../../commands";
import { stringToChannel } from "../../utils/parsers";
import { LOG_LOG_CHANNEL, LOG_TYPE_REMOVE, LOG_TYPE_ADD } from "../../Database";

var command: commandInterface = { name: null, path: null, dm: null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };


command.run = async (bot: bot, message: Message, args: string, permissionLevel: number) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(command.embedHelp(bot));
            return;
        }
        var argsArray = args.split(" ").filter(x => x.length != 0);

        var guildDoc = await bot.database.findGuildDoc(message.guild.id);

        if (argsArray[argIndex] == "rem") {
            var oldChannel = guildDoc.toObject().logChannel;
            guildDoc.logChannel = null;
            guildDoc.save();
            bot.mStatistics.logCommandUsage(command.name, "remove");
            bot.database.log(message.guild, message.member, LOG_LOG_CHANNEL, { type: LOG_TYPE_REMOVE, channel: oldChannel });
            message.channel.send("Successfully unassigned log channel");
            return;
        }
        if (argsArray[argIndex] == "list") {
            var guildObject = guildDoc.toObject();
            if (!guildObject.logChannel) {
                message.channel.send("Currently no channel assigned as log channel");
                return;
            }
            bot.mStatistics.logCommandUsage(command.name, "list");
            message.channel.send("Current log channel is " + bot.client.channels.get(guildObject.logChannel).toString());
            return;
        }

        var channel = stringToChannel(message.guild, argsArray[argIndex]);
        if (!channel) {
            message.channel.send("Couldn't find '" + argsArray[argIndex] + "' channel");
        }
        guildDoc.logChannel = channel.id;
        guildDoc.save();
        bot.mStatistics.logCommandUsage(command.name, "set");
        bot.database.log(message.guild, message.member, LOG_LOG_CHANNEL, { type: LOG_TYPE_ADD, channel: channel.id });
        message.channel.send("Successfully assigned log channel to " + channel.toString());
    } catch (e) {
        bot.error(message, e);
    }
}

command.name = "log";
command.path = "";
command.dm = false;
command.permissionLevel = ADMIN;
command.shortHelp = "sets log channel";
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
                    "value": "assignes/unassignes and list log channel"
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
                    "value": "{command} [channel]\n{command} rem\n{command} list".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command} #logs\n{command} rem\n{command} list".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                }
            ]
        }
    }
};

export default command;