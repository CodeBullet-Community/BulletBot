import { Message, RichEmbed, Guild } from 'discord.js';
import { permLevels } from '../../utils/permissions';
import { stringToChannel, stringToEmbed, permToString } from '../../utils/parsers';
import { sendMentionMessage, sendError } from '../../utils/messages';
import { commandInterface } from '../../commands';
import { Bot } from '../..';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return;
        }
        var argsArray = args.split(" ").filter(x => x.length != 0);

        var channel: any = stringToChannel(message.guild, argsArray[argIndex]);
        if (!channel) {
            channel = message.channel;
        } else {
            if (!dm) {
                if (!channel.permissionsFor(message.member).hasPermission("SEND_MESSAGES")) {
                    message.channel.send("You don't have permission to write in " + channel);
                    Bot.mStats.logMessageSend();
                    return;
                }
                if (!channel.permissionsFor(message.guild.me).hasPermission("SEND_MESSAGES")) {
                    message.channel.send("I don't have permission to write in " + channel);
                    Bot.mStats.logMessageSend();
                    return
                }
            }
            if (!channel.send) {
                message.channel.send("I can't write in a voice channel");
                Bot.mStats.logMessageSend();
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
                Bot.mStats.logMessageSend();
                return;
            }
            content = embedObject.content;
        }

        if (content && content.includes("{{role:")) {
            sendMentionMessage(message.guild, channel, content, embedObject, requestTimestamp, command.name);
        } else {
            Bot.mStats.logResponseTime(command.name, requestTimestamp);
            channel.send(content, embedObject);
        }
        Bot.mStats.logMessageSend();
        Bot.mStats.logCommandUsage(command.name, embed ? "embed" : "normal");
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'say';
command.path = '';
command.dm = true;
command.permLevel = permLevels.mod;
command.togglable = false;
command.shortHelp = 'let\'s the bot speak for you';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.helpEmbedColor,
            'author': {
                'name': 'Command: ' + prefix + command.name
            },
            'fields': [
                {
                    'name': 'Description:',
                    'value': 'let\'s you control what bot says\ncan also send embed\nuse [this generator](https://leovoel.github.io/embed-visualizer/) to generate the json text for embed'
                },
                {
                    'name': 'Need to be:',
                    'value': permToString(command.permLevel),
                    'inline': true
                },
                {
                    'name': 'DM capable:',
                    'value': command.dm,
                    'inline': true
                },
                {
                    'name': 'Togglable:',
                    'value': command.togglable,
                    'inline': true
                },
                {
                    'name': 'Usage:',
                    'value': '{command} [channel] [message]\n{command} [channel] embed [embed json]'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} Hey I\'m BulletBot\n{command} #general Hey I\'m BulletBot\n{command} #announcement embed [some embed json text]'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;