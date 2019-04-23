import mongoose = require('mongoose');
import { webhookDoc, webhookSchema, webhookObject } from './database/schemas';
import { google } from "googleapis";
import { Bot } from '.';
import { googleAPIKey, callbackPath, callbackPort, callbackURL } from "./bot-config.json";
import request = require("request");
import express = require("express");
import bodyParser = require("body-parser");
import xml2js = require('xml2js')
import { sendMentionMessage } from './utils/messages';
const xmlParser = new xml2js.Parser({ explicitArray: false });

export async function getYTChannelID(input: string) {
    if (input.includes("channel/")) {
        return input.split("channel/")[1];
    }
    if (input.includes("user/")) {
        input = input.split("user/")[1];
    }
    var response = await google.youtube("v3").channels.list({
        key: googleAPIKey,
        forUsername: input,
        part: "id"
    });
    if (response.data && response.data.items && response.data.items[0] && response.data.items[0].id) {
        return response.data.items[0].id;
    }
}

export async function YTChannelExists(YTChannelID: string) {
    var response = await google.youtube("v3").channels.list({
        key: googleAPIKey,
        id: YTChannelID,
        part: "id"
    });
    if (response.data && response.data.items && response.data.items[0]) return true;
    return false;
}

export function addYoutubeCatcher(app: express.Application) {
    app.use(callbackPath + '/youtube', bodyParser.text({ type: 'application/atom+xml' }));
    app.get(callbackPath + '/youtube', (req, res) => {
        res.status(200).send(req.query['hub.challenge']);
    });
    app.post(callbackPath + '/youtube', function (req, res) {
        xmlParser.parseString(req.body, async (error, result) => {
            if (error) {
                res.status(422).json({ code: 'xml_parse_error', details: "Something went wrong while parsing the XML", error });
            } else {
                var video = result.feed.entry
                var publishUpdateDifference = Date.parse(video.updated) - Date.parse(video.published)
                const type = (publishUpdateDifference > 300000) ? 'updated' : 'published'
                if (type != "published") {
                    res.sendStatus(200);
                    return;
                }
                var webhooks = await Bot.youtube.webhooks.find({ feed: video["yt:channelId"] }).exec();
                if (webhooks.length == 0) {
                    res.sendStatus(404);
                    return;
                }

                const link = "https://youtu.be/" + video["yt:videoId"];
                for (const webhook of webhooks) {
                    const webhookObject: webhookObject = webhook.toObject();
                    var guild = Bot.client.guilds.get(webhookObject.guild);
                    if (!guild) {
                        console.warn("in youtube webhookcatcher guild " + webhookObject.guild + " wasn't found");
                        webhook.remove();
                    }
                    var channel: any = guild.channels.get(webhookObject.channel);
                    if (!channel) webhook.remove();
                    var message: string = webhookObject.message;
                    message = message.replace("{{link}}", link).replace("{{title}}", video.title).replace("{{channelName}}", video.author.name).replace("{{channelLink}}", video.author.uri);
                    if (message.includes("{{role:")) {
                        sendMentionMessage(guild, channel, message);
                    } else {
                        channel.send(message);
                    }
                    Bot.mStats.logMessageSend();
                }
                res.sendStatus(200);
            }
        });
    });
}

export class YTWebhookManager {
    connection: mongoose.Connection;
    webhooks: mongoose.Model<webhookDoc>;

    constructor(URI: string, authDB: string) {
        this.connection = mongoose.createConnection(URI + '/webhooks' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        this.connection.on('error', console.error.bind(console, 'connection error:'));
        this.connection.once('open', function () {
            console.log('connected to /webhooks database');
        });
        this.webhooks = this.connection.model("youtubeWebhook", webhookSchema, "youtube");
    }

    get(webhookID: mongoose.Schema.Types.ObjectId) {
        return this.webhooks.findById(webhookID).exec();
    }

    private async subToChannel(YTChannelID: string, subscribe: boolean) {
        return new Promise((resolve, reject) => {
            request.post('https://pubsubhubbub.appspot.com/subscribe', {
                form: {
                    'hub.mode': subscribe ? 'subscribe' : 'unsubscribe',
                    'hub.callback': `https://${callbackURL}:${callbackPort}${callbackPath}/youtube`,
                    'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=' + YTChannelID
                }
            }, (error, response, body) => {
                if (error) reject(error);
                if (response.statusCode != 202) {
                    reject('Invalid status code <' + response.statusCode + '>');
                }
                resolve(body);
            });
        });
    }

    async createWebhook(guildID: string, channelID: string, YTChannelID: string, message: string) {
        var sameFeedWebhook = await this.webhooks.findOne({ feed: YTChannelID });
        if (sameFeedWebhook && sameFeedWebhook.guild == guildID && sameFeedWebhook.channel == channelID) return undefined;
        if (!sameFeedWebhook) {
            try {
                this.subToChannel(YTChannelID, true);
            } catch (e) {
                console.error('error while subscribing to youtube webhook:', e);
                return null;
            }
        }
        var guildDoc = await Bot.database.findGuildDoc(guildID);
        if (!guildDoc) return undefined;
        var webhhookDoc = new this.webhooks({
            feed: YTChannelID,
            guild: guildID,
            channel: channelID,
            message: message
        });
        await webhhookDoc.save();
        if (!guildDoc.webhooks) guildDoc.webhooks = {};
        if (!guildDoc.webhooks.youtube) guildDoc.webhooks.youtube = [];
        guildDoc.webhooks.youtube.push(webhhookDoc.id);
        await guildDoc.save()
        Bot.mStats.logWebhookAction('youtube', 'created');
        return webhhookDoc;
    }

    async deleteWebhook(guildID: string, channelID: string, YTChannelID: string) {
        var webhhookDoc = await this.webhooks.findOne({ feed: YTChannelID, guild: guildID, channel: channelID }).exec();
        if (!webhhookDoc) return undefined;
        var guildDoc = await Bot.database.findGuildDoc(guildID);
        if (!guildDoc) return undefined;
        guildDoc.webhooks.youtube.splice(guildDoc.webhooks.youtube.indexOf(webhhookDoc.id), 1);
        await guildDoc.save();

        var sameFeedWebhookCount = await this.webhooks.countDocuments({ feed: YTChannelID }).exec();
        if (sameFeedWebhookCount == 1) {
            try {
                this.subToChannel(YTChannelID, false);
            } catch (e) {
                console.error('error while unsubscribing to youtube webhook:', e);
                return null;
            }
        }
        Bot.mStats.logWebhookAction('youtube', 'deleted')
        return await webhhookDoc.remove();
    }

    async changeWebhook(guildID: string, channelID: string, YTChannelID: string, newChannelID?: string, newYTChannelID?: string, newMessage?: string) {
        var webhhookDoc = await this.webhooks.findOne({ feed: YTChannelID, guild: guildID, channel: channelID }).exec();
        if (!webhhookDoc) return undefined;
        Bot.mStats.logWebhookAction('youtube', 'changed');
        if (newYTChannelID) {
            var newWebhookDoc = await this.createWebhook(guildID, (newChannelID ? newChannelID : channelID),
                newYTChannelID, (newMessage ? newMessage : webhhookDoc.toObject().message));
            if (!newWebhookDoc) return undefined;
            await this.deleteWebhook(guildID, channelID, YTChannelID)
            return newWebhookDoc;
        }
        if (newChannelID) {
            webhhookDoc.channel = newChannelID;
        }
        if (newMessage) {
            webhhookDoc.message = newMessage;
        }
        webhhookDoc.save();
        return webhhookDoc;
    }
}