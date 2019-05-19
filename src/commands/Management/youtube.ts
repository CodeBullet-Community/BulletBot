import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { webhookObject, logTypes } from '../../database/schemas';
import { googleAPIKey, youtube } from '../../bot-config.json';
import { google } from 'googleapis';
import { getYTChannelID } from '../../youtube';

async function parseWebhookInput(message: Message, argsArray: string[], argIndex: number) {
    argIndex++;
    if (!argsArray[argIndex]) {
        message.channel.send("URL/Name isn't given");
        Bot.mStats.logMessageSend();
        return;
    }
    var YTChannelID = await getYTChannelID(argsArray[argIndex]);
    if (!YTChannelID) {
        message.channel.send("URL/Name couldn't be parsed");
        Bot.mStats.logMessageSend();
        return;
    }

    argIndex++;
    var channel = stringToChannel(message.guild, argsArray[argIndex]);
    if (!channel) {
        message.channel.send("channel isn't given");
        Bot.mStats.logMessageSend();
        return;
    }

    return { YTChannelID: YTChannelID, channel: channel, argIndex: argIndex };
}

async function createWebhookEmbed(webhookObject: webhookObject) {
    var channelInfo = await google.youtube('v3').channels.list({
        key: googleAPIKey,
        id: webhookObject.feed,
        part: "snippet"
    });
    if (!channelInfo.data.items || !channelInfo.data.items[0]) return null;
    var logo = channelInfo.data.items[0].snippet.thumbnails.medium.url;
    var name = channelInfo.data.items[0].snippet.title;
    var link = `https://www.youtube.com/channel/${webhookObject.feed}` +
        (channelInfo.data.items[0].snippet.customUrl ? "\nhttps://youtube.com/" + channelInfo.data.items[0].snippet.customUrl : "");
    if (!logo || !name || !link) return null;
    return {
        "embed": {
            "color": youtube.color,
            "timestamp": new Date().toISOString(),
            "footer": { "icon_url": youtube.logo, "text": youtube.name },
            "thumbnail": { "url": logo },
            "author": { "name": name + ":" },
            "fields": [
                {
                    "name": "Link:",
                    "value": link
                },
                {
                    "name": "Channel:",
                    "value": `<#${webhookObject.channel}>`,
                    "inline": true
                },
                {
                    "name": "Message:",
                    "value": webhookObject.message,
                    "inline": true
                }
            ]
        }
    }
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number,number]) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return false;
        }
        var argsArray = args.split(' ').filter(x => x.length != 0);

        switch (argsArray[argIndex]) {
            case 'list':
                var guildDoc = await Bot.database.findGuildDoc(message.guild.id);
                if (!guildDoc) throw new Error(`Couldn't find guild doc of guild ${message.guild.id} in youtube list command`);
                if (!guildDoc.webhooks || !guildDoc.webhooks.youtube || !guildDoc.webhooks.youtube.length) {
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send('There aren\'t any YouTube webhooks');
                    Bot.mStats.logMessageSend();
                    return;
                } else {
                    for (const webhookID of guildDoc.toObject().webhooks.youtube) {
                        var embed = await createWebhookEmbed((await Bot.youtube.get(webhookID)).toObject());
                        if (webhookID == guildDoc.webhooks.youtube[0])
                            Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(embed);
                        Bot.mStats.logMessageSend();
                    }
                }
                Bot.mStats.logCommandUsage(command.name, 'list');
                break;
            case 'add':
                var input = await parseWebhookInput(message, argsArray, argIndex);
                if (!input) return false;
                argIndex = input.argIndex + 1;
                var text = "";
                while (argIndex < argsArray.length) {
                    text += argsArray[argIndex] + " ";
                    argIndex++;
                }
                if (text.length == 0) {
                    message.channel.send("message isn't given");
                    Bot.mStats.logMessageSend();
                    return false;
                }
                if (text.length > 500) {
                    message.channel.send('The message should\'t be longer then 500 characters');
                    Bot.mStats.logMessageSend();
                    return false;
                }


                var webhookDoc = await Bot.youtube.createWebhook(message.guild.id, input.channel.id, input.YTChannelID, text);
                Bot.mStats.logResponseTime(command.name, requestTime);
                Bot.mStats.logCommandUsage(command.name, "add");
                Bot.mStats.logMessageSend();
                if (!webhookDoc) {
                    message.channel.send('Adding Webhook was unsuccessful. Most likely a webhook with the same feed is already assigned to ' + input.channel + '.');
                    return;
                } else {
                    message.channel.send(`Successfully added webhook to ${input.channel} for https://youtube.com/channel/${input.YTChannelID}`);
                    Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, logTypes.add);
                }
                break;
            case 'rem':
                var input = await parseWebhookInput(message, argsArray, argIndex);
                if (!input) return false;
                argIndex = input.argIndex;


                var webhookDoc = await Bot.youtube.deleteWebhook(message.guild.id, input.channel.id, input.YTChannelID);
                Bot.mStats.logResponseTime(command.name, requestTime);
                Bot.mStats.logCommandUsage(command.name, "remove");
                if (!webhookDoc) {
                    message.channel.send(`Removing webhook was unsuccessful. A webhook to ${input.channel} for https://youtube.com/channel/${input.YTChannelID} doesn't exist.`);

                } else {
                    message.channel.send(`Successfully removed webhook to ${input.channel} for https://youtube.com/channel/${input.YTChannelID}`);
                    Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, logTypes.remove);
                }
                Bot.mStats.logMessageSend();
                break;
            case 'change':
                argIndex++;
                var property = argsArray[argIndex];
                if (property != 'channel' && property != 'feed' && property != 'message') {
                    message.channel.send('you can\'t change the property `' + property + '`\nfollowing properties are modifiable:\n **-** \`channel\`\n **-** \`feed\`\n **-** \`message\`');
                    Bot.mStats.logMessageSend();
                    return false;
                }

                var input = await parseWebhookInput(message, argsArray, argIndex);
                argIndex = input.argIndex + 1;
                switch (property) {
                    case 'channel':
                        var newChannel = stringToChannel(message.guild, argsArray[argIndex]);
                        if (!newChannel) {
                            message.channel.send("new channel isn't given");
                            return false;
                        }

                        var webhookDoc = await Bot.youtube.changeWebhook(message.guild.id, input.channel.id, input.YTChannelID, newChannel.id);
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        Bot.mStats.logCommandUsage(command.name, 'changeChannel');
                        Bot.mStats.logMessageSend();
                        if (webhookDoc && webhookDoc.channel == newChannel.id) {
                            message.channel.send(`Successfully changed webhook channel from ${input.channel} to ${newChannel}`);
                            Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, logTypes.change, true);
                        } else {
                            message.channel.send(`change was unsuccessful`);
                        }
                        break;
                    case 'feed':
                        if (!argsArray[argIndex]) {
                            message.channel.send("new feed isn't given");
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                        var newYTChannelID = await getYTChannelID(argsArray[argIndex]);
                        if (!newYTChannelID) {
                            message.channel.send("new feed couldn't be parsed");
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                        var webhookDoc = await Bot.youtube.changeWebhook(message.guild.id, input.channel.id, input.YTChannelID, undefined, newYTChannelID);
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        Bot.mStats.logCommandUsage(command.name, 'changeFeed');
                        Bot.mStats.logMessageSend();
                        if (webhookDoc && webhookDoc.feed == newYTChannelID) {
                            message.channel.send(`Successfully changed webhook feed from https://youtube.com/channel/${input.YTChannelID} to https://youtube.com/channel/${webhookDoc.feed}`);
                            Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, logTypes.add);
                        } else {
                            message.channel.send(`change was unsuccessful`);
                        }
                        break;
                    case 'message':
                        var newText = "";
                        while (argIndex < argsArray.length) {
                            newText += argsArray[argIndex] + " ";
                            argIndex++;
                        }
                        if (newText.length == 0) {
                            message.channel.send("new message isn't given");
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                        if (newText.length > 500) {
                            message.channel.send('The new message should\'t be longer then 500 characters');
                            Bot.mStats.logMessageSend();
                            return false;
                        }

                        var webhookDoc = await Bot.youtube.changeWebhook(message.guild.id, input.channel.id, input.YTChannelID, undefined, undefined, newText);
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        Bot.mStats.logCommandUsage(command.name, 'changeMessage');
                        Bot.mStats.logMessageSend();
                        if (webhookDoc && webhookDoc.message == newText) {
                            message.channel.send(`Successfully changed webhook message to \`${newText}\``);
                            Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, logTypes.change, undefined, true);
                        } else {
                            message.channel.send(`change was unsuccessful`);
                        }
                        break;
                }
                break;
            default:
                message.channel.send(`Unknown action. Use list, add, rem or change`);
                Bot.mStats.logMessageSend();
                break;
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'youtube';
command.path = '';
command.dm = true;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'create/delete/change YouTube webhooks';
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
                    'value': 'let\'s you create/delete/change YouTube webhooks'
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
                    'value': ('{command} list\n' +
                        '{command} add [URL/Name] [channel] [message]\n' +
                        '[message] can contain several {{role:[role]}}, {{link}}, {{title}}, {{channelName}}, {{channelLink}}\n' +
                        '{command} rem [URL/Name] [channel]\n{command} change [channel/feed/message] [URL/Name] [channel] [new channel/feed/message]\n' +
                        'feed is URL/Name').replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': ('{command} list\n{command} add Kurzgesagt #videos Hey {{role:yt_notif}}, {{channelName}} just uploaded a video titled {{title}}. Go see it here: {{link}}\n' +
                        '{command} rem Kurzgesagt #videos\n' +
                        '{command} change channel https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNM8Q #videos #new-videos-channel').replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;