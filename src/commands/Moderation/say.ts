import { Message, RichEmbed, Guild, TextChannel, GuildChannel, DMChannel, Channel, GroupDMChannel } from 'discord.js';
import { permLevels } from '../../utils/permissions';
import { stringToChannel, stringToEmbed, permToString } from '../../utils/parsers';
import { sendMentionMessage, sendError } from '../../utils/messages';
import { commandInterface } from '../../commands';
import { Bot } from '../..';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return;
        }
        var argsArray = args.split(" ").filter(x => x.length != 0);

        var channel: any = stringToChannel(message.guild, argsArray[argIndex]);
        if (!channel) {
            channel = message.channel;
        } else {
            if (!channel.permissionsFor(message.member).has("SEND_MESSAGES")) {
                message.channel.send("You don't have permission to write in " + channel);
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!channel.send) {
                message.channel.send("I can't write in a voice channel");
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;
        }
        if (!channel.permissionsFor(message.guild.me).has("SEND_MESSAGES")) {
            message.channel.send("I don't have permission to write in " + channel);
            Bot.mStats.logMessageSend();
            return false;
        }

        let editMessage: Message;
        if (argsArray[argIndex] == 'edit') {
            if (isNaN(Number(argsArray[argIndex + 1]))) {
                message.channel.send(`Couldn't parse the message id`);
                Bot.mStats.logMessageSend();
                return false;
            } else {
                try {
                    editMessage = await channel.fetchMessage(argsArray[argIndex + 1]);
                } catch (e) {
                    message.channel.send(`Couldn't find message with ${argsArray[argIndex + 1]} as ID`);
                    Bot.mStats.logMessageSend();
                    return false;
                }
                if (editMessage.author.id != Bot.client.user.id) {
                    message.channel.send(`The specified message isn't my message`);
                    Bot.mStats.logMessageSend();
                    return false;
                }
                argIndex += 2;
            }
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
                return false;
            }
            content = embedObject.content;
        }

        try {
            if (content && content.includes("{{role:")) {
                await sendMentionMessage(message.guild, channel, content, embedObject, editMessage, requestTime, command.name);
            } else {
                Bot.mStats.logResponseTime(command.name, requestTime);
                if (editMessage) {
                    await editMessage.edit(content, embedObject ? embedObject : { embed: {} });
                } else {
                    await channel.send(content, embedObject);
                }
            }
        } catch (e) {
            message.channel.send("couldn't send message");
            return false;
        }
        Bot.mStats.logMessageSend();
        if (editMessage) {
            Bot.mStats.logCommandUsage(command.name, embed ? "editEmbed" : "editNormal");
        } else {
            Bot.mStats.logCommandUsage(command.name, embed ? "embed" : "normal");
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
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
            'color': Bot.database.settingsDB.cache.embedColors.help,
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
                    'value': '{command} [channel] [message]\n{command} [channel] embed [embed json]\n{command} [channel] edit [message id] [new message]\n{command} [channel] edit [message id] embed [new embed json]'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} Hey I\'m BulletBot\n{command} #general Hey I\'m BulletBot\n{command} #announcement embed [some embed json text]\n{command} #announcement edit 571607771657535490 I\m not BulletBot'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;