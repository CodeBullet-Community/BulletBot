import { BOTMASTER, MEMBER, ADMIN } from "../../utils/permissions";
import { bot } from "../..";
import utils from "../../utils";
import { Message } from "discord.js";
import { command as commandInterface } from "../../commands";
import { webhookInterface } from "../../Database";
import { google as GOOGLE_API_KEY } from "../../apiKeys.json";
import { google, youtube_v3 } from "googleapis";

const SERVICES = {
    youtube: {
        logo: "https://www.android-user.de/wp-content/uploads/2018/07/icon-youtobe.png",
        color: 16711680,
        name: "YouTube"
    }
}

async function listWebhooks(bot: bot, message: Message, service: string) {
    var guildObject = (await bot.database.findGuildDoc(message.guild.id)).toObject();
    var webhooks: webhookInterface[] = [];
    if (guildObject.webhooks[service].length == 0) {
        message.channel.send(`This server doesn't have any webhooks for \`${SERVICES[service].name}\`.`);
        return;
    }
    for (const id of guildObject.webhooks[service]) {
        webhooks.push(await bot.database.webhookDB[service].findById(id).exec());
    }
    var youtube: youtube_v3.Youtube;
    if (service == bot.webhooks.youtube.name) {
        youtube = google.youtube("v3");
    }
    for (const webhook of webhooks) {
        var webhookObject = webhook.toObject();
        var logo: string;
        var name: string;
        var link: string;
        switch (service) {
            case bot.webhooks.youtube.name:
                var channelInfo = await youtube.channels.list({
                    key: GOOGLE_API_KEY,
                    id: webhookObject.feed,
                    part: "snippet"
                });
                if (!channelInfo.data.items || !channelInfo.data.items[0]) continue;
                logo = channelInfo.data.items[0].snippet.thumbnails.medium.url;
                name = channelInfo.data.items[0].snippet.title;
                link = `https://www.youtube.com/channel/${webhookObject.feed}` +
                    (channelInfo.data.items[0].snippet.customUrl ? "\nhttps://youtube.com/" + channelInfo.data.items[0].snippet.customUrl : "");
        }
        if (!logo || !name || !link) continue;
        message.channel.send({
            "embed": {
                "color": SERVICES[service].color,
                "timestamp": new Date().toISOString(),
                "footer": {
                    "icon_url": SERVICES[service].logo,
                    "text": SERVICES[service].name
                },
                "thumbnail": {
                    "url": logo
                },
                "author": {
                    "name": name + ":"
                },
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
        });
    }
}

var command: commandInterface = { name: null, path: null, dm: null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };

command.run = async (bot: bot, message: Message, args: string, permissionLevel: number) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(command.embedHelp(bot));
            return;
        }

        var argsArray = args.split(" ");
        if (argsArray[argIndex] == "list") {
            for (const service of bot.webhooks.serviceNames) {
                await listWebhooks(bot, message, service);
            }
            bot.mStatistics.logCommandUsage(command.name);
            return;
        }

        if (bot.webhooks.serviceNames.includes(argsArray[argIndex].toLowerCase())) {
            var service = argsArray[argIndex].toLowerCase();
            argIndex++;
            switch (argsArray[argIndex]) {
                case "list":
                    await listWebhooks(bot, message, service);
                    break;
                case "add":
                    argIndex++;
                    var feed = argsArray[argIndex];
                    if (!feed) {
                        message.channel.send("URL/Name isn't given");
                        return;
                    }

                    argIndex++;
                    var channel = utils.parsers.stringToChannel(message.guild, argsArray[argIndex]);
                    if (!channel) {
                        message.channel.send("channel isn't given");
                        return;
                    }

                    argIndex++;
                    var text = "";
                    while (argIndex < argsArray.length) {
                        text += argsArray[argIndex] + " ";
                        argIndex++;
                    }
                    if (text.length == 0) {
                        message.channel.send("message isn't given");
                        return;
                    }

                    var output = await bot.webhooks[service].createWebhook(bot, message.guild, channel, feed, text);
                    if (!output) {
                        message.channel.send("Adding Webhook was unsuccessful. Most likely the input feed (" + feed + ") doesn't exist **or** there is already a webhook with the same feed for " + channel + ".");
                        return;
                    } else {
                        message.channel.send(`Successfully added webhook to ${channel.toString()} for ${feed}`);
                    }
                    break;
                case "rem":
                    argIndex++;
                    var feed = argsArray[argIndex];
                    if (!feed) {
                        message.channel.send("URL/Name isn't given");
                        return;
                    }

                    argIndex++;
                    var channel = utils.parsers.stringToChannel(message.guild, argsArray[argIndex]);
                    if (!channel) {
                        message.channel.send("channel isn't given");
                        return;
                    }

                    var deleted = await bot.webhooks[service].deleteWebhook(bot, message.guild, channel, feed);
                    if (deleted) {
                        message.channel.send(`Successfully removed webhook to ${channel.toString()} for ${feed}`);
                    } else {
                        message.channel.send(`Removing webhook was unsuccessful. A webhook to ${channel.toString()} for ${feed} doesn't exist.`);
                    }
                    break;
                case "change":
                    argIndex++;
                    var property = argsArray[argIndex];
                    if (property != "channel" && property != "feed" && property != "message") {
                        message.channel.send("you can change the property `" + property + "`\nfollowing properties are modifiable:\n **-** \`channel\`\n **-** \`feed\`\n **-** \`message\`");
                        return;
                    }

                    argIndex++;
                    var feed = argsArray[argIndex];
                    if (!feed) {
                        message.channel.send("URL/Name isn't given");
                        return;
                    }

                    argIndex++;
                    var channel = utils.parsers.stringToChannel(message.guild, argsArray[argIndex]);
                    if (!channel) {
                        message.channel.send("channel isn't given");
                        return;
                    }

                    switch (property) {
                        case "channel":
                            argIndex++;
                            var newChannel = utils.parsers.stringToChannel(message.guild, argsArray[argIndex]);
                            if (!newChannel) {
                                message.channel.send("new channel isn't given");
                                return;
                            }
                            var change = await bot.webhooks.youtube.changeWebhook(bot, message.guild, channel, feed, newChannel);
                            if (change.toObject().channel == newChannel.id) {
                                message.channel.send(`Successfully changed webhook channel from ${channel.toString()} to ${newChannel}`);
                            } else {
                                message.channel.send(`change was unsuccessful`);
                            }
                            break;
                        case "feed":
                            argIndex++;
                            var newFeed = argsArray[argIndex];
                            if (!newFeed) {
                                message.channel.send("new feed isn't given");
                                return;
                            }
                            var change = await bot.webhooks.youtube.changeWebhook(bot, message.guild, channel, feed, null, newFeed);
                            if ((service == bot.webhooks.youtube.name && change.toObject().feed == await bot.webhooks.youtube.getChannelID(newFeed))) {
                                message.channel.send(`Successfully changed webhook feed from \`${feed}\` to \`${newFeed}\``);
                            } else {
                                message.channel.send(`change was unsuccessful`);
                            }
                            break;
                        case "message":
                            argIndex++;
                            var newText = "";
                            while (argIndex < argsArray.length) {
                                newText += argsArray[argIndex] + " ";
                                argIndex++;
                            }
                            if (newText.length == 0) {
                                message.channel.send("new message isn't given");
                                return;
                            }
                            var change = await bot.webhooks.youtube.changeWebhook(bot, message.guild, channel, feed, null, null, newText);
                            if (change.toObject().message == newText) {
                                message.channel.send(`Successfully changed webhook message to \`${newText}\``);
                            } else {
                                message.channel.send(`change was unsuccessful`);
                            }
                            break;
                    }
                    break;
                default:
                    message.channel.send(`unknown option "${argsArray[argIndex]}"\navailable options:\n **-** \`list\`\n **-** \`add\`\n **-** \`rem\`\n **-** \`change\``);
                    break;
            }
        } else {
            var error = `unknown service \`${argsArray[argIndex]}\`\nYou can choose following services:`;
            for (const service of bot.webhooks.serviceNames) {
                error += "\n **-** `" + SERVICES[service].name + "`";
            }
            message.channel.send(error)
        }
        bot.mStatistics.logCommandUsage(command.name);
    } catch (e) {
        bot.error(message, e);
    }
}

command.name = "webhook";
command.path = "";
command.dm = false;
command.permissionLevel = ADMIN;
command.shortHelp = "let's you create/delete/change webhooks";
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
                    "value": "let's you create/delete/change webhooks\ncurrently supported services:\n **-** Youtube"
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
                    "value": "{command} list\n{command} [service] list\n{command} [service] add [URL/Name] [channel] [message]\n[message] can contain several {{role:[role]}}, {{user:[user]}}, {{link}} or {{title}}\n{command} [service] rem [URL/Name] [channel]\n{command} [service] change [channel/feed/message] [URL/Name] [channel] [new channel/feed/message]\nfeed is URL/Name".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command} list\n{command} youtube list\n{command} youtube add Kurzgesagt #videos Hey {{role:Kurzgesagt_squad}}, Kurzgesagt just uploaded a video titled {{title}}. Go see it here: {{link}}\n{command} youtube rem https://www.youtube.com/user/Kurzgesagt #videos\n{command} youtube change channel https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNM8Q #video #new-video-channel".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                }
            ]
        }
    }
};

export default command;