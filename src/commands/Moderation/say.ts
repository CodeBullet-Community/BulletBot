import { Message, RichEmbed, Guild, TextChannel, GuildChannel, DMChannel, Channel, GroupDMChannel } from 'discord.js';
import { permLevels } from '../../utils/permissions';
import { stringToChannel, stringToEmbed, permToString } from '../../utils/parsers';
import { sendMentionMessage, sendError } from '../../utils/messages';
import { commandInterface } from '../../commands';
import { Bot } from '../..';

var command: commandInterface = {
    name: 'say',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    help: {
        shortDescription: 'Lets the bot speak for you',
        longDescription: 'Lets you control what bot says\ncan also send embed\nuse [this generator](https://leovoel.github.io/embed-visualizer/) to generate the json text for embed',
        usages: [
            '{command} [channel] [message]',
            '{command} [channel] embed [embed json]',
            '{command} [channel] edit [message id] [new message]',
            '{command} [channel] edit [message id] embed [new embed json]'
        ],
        examples: [
            '{command} Hey I\'m BulletBot',
            '{command} #general Hey I\'m BulletBot',
            '{command} #announcement embed [some embed json text]',
            '{command} #announcement edit 571607771657535490 I\'m not BulletBot'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            var argIndex = 0;
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return;
            }
            var argsArray = args.split(" ").filter(x => x.length != 0); // split arguments string by spaces

            // get channel to send it in
            var channel: any = stringToChannel(message.guild, argsArray[argIndex], false, false);
            if (!channel) {
                channel = message.channel;
            } else {
                // check if requester has permission to write in the channel
                if (!channel.permissionsFor(message.member).has("SEND_MESSAGES")) {
                    message.channel.send("You don't have permission to write in " + channel);
                    Bot.mStats.logMessageSend();
                    return false;
                }
                // check if channel is a voice channel
                if (!channel.send) {
                    message.channel.send("I can't write in a voice channel");
                    Bot.mStats.logMessageSend();
                    return false;
                }
                argIndex++;
            }
            // check if bot has permission to write in the channel
            if (!channel.permissionsFor(message.guild.me).has("SEND_MESSAGES")) {
                message.channel.send("I don't have permission to write in " + channel);
                Bot.mStats.logMessageSend();
                return false;
            }

            // if requester wants to edit a message
            let editMessage: Message;
            if (argsArray[argIndex] == 'edit') {
                if (isNaN(Number(argsArray[argIndex + 1]))) { // if provided message id was invalid
                    message.channel.send(`Couldn't parse the message id`);
                    Bot.mStats.logMessageSend();
                    return false;
                } else {
                    // try to get the message to be edited
                    try {
                        editMessage = await channel.fetchMessage(argsArray[argIndex + 1]);
                    } catch (e) {
                        message.channel.send(`Couldn't find message with ${argsArray[argIndex + 1]} as ID`);
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    // check if the message is from BulletBot
                    if (editMessage.author.id != Bot.client.user.id) {
                        message.channel.send(`The specified message isn't my message`);
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    argIndex += 2;
                }
            }

            // if user wants to send a embed
            var embed = false;
            if (argsArray[argIndex] == "embed") {
                embed = true;
                argIndex++;
            }

            // get text / embed
            var processedArgs = "";
            for (var i = 0; i < argIndex; i++) {
                processedArgs += argsArray[i] + " ";
            }
            var text = args.slice(processedArgs.length);

            var content = text;
            // parse text to embed
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

            // check if requester can mention everyone and if so, allow everyone mention
            let mentionEveryone = permLevel >= permLevels.admin ? true : false;
            if (!mentionEveryone) mentionEveryone = message.member.hasPermission('MENTION_EVERYONE');

            try {
                if (content && content.includes("{{role:")) { // if content contains unmentioned role mentions
                    await sendMentionMessage(message.guild, channel, content, !mentionEveryone, embedObject, editMessage, requestTime, command.name);
                } else {
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    // disable everyone mention if needed
                    if (embedObject) {
                        embedObject.disableEveryone = !mentionEveryone;
                    } else {
                        embedObject = { disableEveryone: !mentionEveryone };
                    }

                    // send or edit message
                    if (editMessage) {
                        if (!embedObject.embed) embedObject.embed = {};
                        await editMessage.edit(content, embedObject);
                    } else {
                        await channel.send(content, embedObject);
                    }
                }
            } catch (e) {
                message.channel.send("couldn't send message");
                return false;
            }
            Bot.mStats.logMessageSend();
            // log command usage
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
};

export default command;