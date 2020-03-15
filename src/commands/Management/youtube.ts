import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { PermLevels } from '../../utils/permissions';
import { googleAPIKey, youtube } from '../../bot-config.json';
import { google } from 'googleapis';
import { getYTChannelID } from '../../youtube';
import { WebhookObject } from '../../database/schemas/webhooks/_webhooks';
import { LogAction } from '../../database/schemas/main/log';

/**
 * helper function for repeated code, which gets the youtube channel ID and the channel for the webhook
 *
 * @param {Message} message request message
 * @param {string[]} argsArray the entire argument array
 * @param {number} argIndex current argument index
 * @returns
 */
async function parseWebhookInput(message: Message, argsArray: string[], argIndex: number) {
    // get youtube channel id
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

    // get channel for webhook
    argIndex++;
    var channel = stringToChannel(message.guild, argsArray[argIndex]);
    if (!channel) {
        message.channel.send("channel isn't given");
        Bot.mStats.logMessageSend();
        return;
    }

    return { YTChannelID: YTChannelID, channel: channel, argIndex: argIndex };
}

/**
 * returns a embed with details about a webhook
 *
 * @param {WebhookObject} webhookObject
 * @returns
 */
async function createWebhookEmbed(webhookObject: WebhookObject) {
    // get channel info from api
    var channelInfo = await google.youtube('v3').channels.list({
        key: googleAPIKey,
        id: webhookObject.feed,
        part: "snippet"
    });
    if (!channelInfo.data.items || !channelInfo.data.items[0]) return null;
    // build embed
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

var command: commandInterface = {
    name: 'youtube',
    path: '',
    dm: false,
    permLevel: PermLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'create/delete/change YouTube webhooks',
        longDescription: 'let\'s you create, delete and change YouTube webhooks',
        usages: [
            '{command} list',
            '{command} add [URL/Name] [channel] [message]' +
            '[message] can contain several {{role:[role]}}, {{link}}, {{title}}, {{channelName}}, {{channelLink}}',
            '{command} rem [URL/Name] [channel]\n{command} change [channel/feed/message] [URL/Name] [channel] [new channel/feed/message]\n' +
            'feed is a channel URL or Name'
        ],
        examples: [
            '{command} list',
            '{command} add Kurzgesagt #videos Hey {{role:yt_notif}}, {{channelName}} just uploaded a video titled {{title}}. Go see it here: {{link}}',
            '{command} rem Kurzgesagt #videos',
            '{command} change channel https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNM8Q #videos #new-videos-channel'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            var argIndex = 0;
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            var argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            switch (argsArray[argIndex]) { // the different actions
                case 'list':
                    var guildDoc = await Bot.database.findGuildDoc(message.guild.id); // get guild doc which contains a list of all webhooks
                    if (!guildDoc) throw new Error(`Couldn't find guild doc of guild ${message.guild.id} in youtube list command`);
                    if (!guildDoc?.webhooks?.youtube?.length) { // check if there are no youtube webhooks
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send('There aren\'t any YouTube webhooks');
                        Bot.mStats.logMessageSend();
                        return;
                    } else {
                        for (const webhookID of guildDoc.toObject().webhooks.youtube) { // send a separate embed for each webhook
                            var embed = await createWebhookEmbed((await Bot.youtube.get(webhookID)).toObject());
                            if (webhookID == guildDoc.webhooks.youtube[0]) // when it's the first message being send
                                Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(embed);
                            Bot.mStats.logMessageSend();
                        }
                    }
                    Bot.mStats.logCommandUsage(command.name, 'list');
                    break;
                case 'add':
                    // parse part of the input
                    var input = await parseWebhookInput(message, argsArray, argIndex);
                    if (!input) return false;
                    argIndex = input.argIndex + 1;

                    // get text for webhook
                    var text = "";
                    while (argIndex < argsArray.length) {
                        text += argsArray[argIndex] + " ";
                        argIndex++;
                    }
                    if (text.length == 0) { // if no message was provided
                        message.channel.send("message isn't given");
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    if (text.length > 500) { // if message is too long
                        message.channel.send('The message should\'t be longer then 500 characters');
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // create webhook
                    var webhookDoc = await Bot.youtube.createWebhook(message.guild.id, input.channel.id, input.YTChannelID, text);

                    // send confirmation or failure message
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    Bot.mStats.logCommandUsage(command.name, "add");
                    Bot.mStats.logMessageSend();
                    if (!webhookDoc) { // if webhook was created
                        message.channel.send('Adding Webhook was unsuccessful. Most likely a webhook with the same feed is already assigned to ' + input.channel + '.');
                        return;
                    } else {
                        message.channel.send(`Successfully added webhook to ${input.channel} for https://youtube.com/channel/${input.YTChannelID}`);
                        // log that webhook was created
                        Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, LogAction.Add);
                    }
                    break;
                case 'rem':
                    // parse part of the input
                    var input = await parseWebhookInput(message, argsArray, argIndex);
                    if (!input) return false;
                    argIndex = input.argIndex;

                    // delete webhook
                    var webhookDoc = await Bot.youtube.deleteWebhook(message.guild.id, input.channel.id, input.YTChannelID);

                    // send confirmation or failure message
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    Bot.mStats.logCommandUsage(command.name, "remove");
                    if (!webhookDoc) { // if webhook was deleted
                        message.channel.send(`Removing webhook was unsuccessful. A webhook to ${input.channel} for https://youtube.com/channel/${input.YTChannelID} doesn't exist.`);
                    } else {
                        message.channel.send(`Successfully removed webhook to ${input.channel} for https://youtube.com/channel/${input.YTChannelID}`);
                        // log that webhook was removed
                        Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, LogAction.Remove);
                    }
                    Bot.mStats.logMessageSend();
                    break;
                case 'change':
                    argIndex++;
                    var property = argsArray[argIndex];
                    if (property != 'channel' && property != 'feed' && property != 'message') { // if the provided property isn't changable or doesn't match exist
                        message.channel.send('you can\'t change the specified property\nfollowing properties are modifiable:\n **-** \`channel\`\n **-** \`feed\`\n **-** \`message\`');
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // parse part of the input
                    var input = await parseWebhookInput(message, argsArray, argIndex);
                    argIndex = input.argIndex + 1;

                    switch (property) { // the different changeable properties
                        case 'channel':
                            // get new channel
                            var newChannel = stringToChannel(message.guild, argsArray[argIndex]);
                            if (!newChannel) {
                                message.channel.send("new channel isn't given");
                                return false;
                            }

                            // change channel on webhook
                            var webhookDoc = await Bot.youtube.changeWebhook(message.guild.id, input.channel.id, input.YTChannelID, newChannel.id);

                            // send confirmation or failure message
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            Bot.mStats.logCommandUsage(command.name, 'changeChannel');
                            Bot.mStats.logMessageSend();
                            if (webhookDoc && webhookDoc.channel == newChannel.id) {
                                message.channel.send(`Successfully changed webhook channel from ${input.channel} to ${newChannel}`);
                                // log that the channel was changed
                                Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, LogAction.change, true);
                            } else {
                                message.channel.send(`change was unsuccessful`);
                            }
                            break;
                        case 'feed':
                            if (!argsArray[argIndex]) { // check if new feed was provided
                                message.channel.send("new feed isn't given");
                                Bot.mStats.logMessageSend();
                                return false;
                            }
                            var newYTChannelID = await getYTChannelID(argsArray[argIndex]);
                            if (!newYTChannelID) { // check if the youtube channel id was found for the new feed
                                message.channel.send("new feed couldn't be parsed");
                                Bot.mStats.logMessageSend();
                                return false;
                            }

                            // change feed of webhook
                            var webhookDoc = await Bot.youtube.changeWebhook(message.guild.id, input.channel.id, input.YTChannelID, undefined, newYTChannelID);

                            // send confirmation or failure message
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            Bot.mStats.logCommandUsage(command.name, 'changeFeed');
                            Bot.mStats.logMessageSend();
                            if (webhookDoc && webhookDoc.feed == newYTChannelID) {
                                message.channel.send(`Successfully changed webhook feed from https://youtube.com/channel/${input.YTChannelID} to https://youtube.com/channel/${webhookDoc.feed}`);
                                // log that the feed was changed
                                Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, LogAction.Add);
                            } else {
                                message.channel.send(`change was unsuccessful`);
                            }
                            break;
                        case 'message':
                            // get new text
                            var newText = "";
                            while (argIndex < argsArray.length) {
                                newText += argsArray[argIndex] + " ";
                                argIndex++;
                            }
                            if (newText.length == 0) { // check if text is empty
                                message.channel.send("new message isn't given");
                                Bot.mStats.logMessageSend();
                                return false;
                            }
                            if (newText.length > 500) { // check if test is too long
                                message.channel.send('The new message should\'t be longer then 500 characters');
                                Bot.mStats.logMessageSend();
                                return false;
                            }

                            // change text
                            var webhookDoc = await Bot.youtube.changeWebhook(message.guild.id, input.channel.id, input.YTChannelID, undefined, undefined, newText);

                            // send confirmation or failure message
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            Bot.mStats.logCommandUsage(command.name, 'changeMessage');
                            Bot.mStats.logMessageSend();
                            if (webhookDoc && webhookDoc.message == newText) {
                                message.channel.send(`Successfully changed webhook message to \`${newText}\``);
                                // log that message was changed
                                Bot.logger.logWebhook(message.guild, message.member, 'youtube', webhookDoc, LogAction.change, undefined, true);
                            } else {
                                message.channel.send(`change was unsuccessful`);
                            }
                            break;
                    }
                    break;
                default:
                    // if action doesn't exist
                    message.channel.send(`Unknown action. Use list, add, rem or change`);
                    Bot.mStats.logMessageSend();
                    break;
            }
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;