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

/**
 * extracts youtube channel id using regex and the youtube_v3 api
 *
 * @export
 * @param {string} input string where youtube channel id should be extracted
 * @returns the extracted youtube channel id
 */
export async function getYTChannelID(input: string) {
    // if input is https://www.youtube.com/channel/[channelID]
    if (input.includes("channel/")) {
        return input.split("channel/")[1];
    }
    // if input is https://www.youtube.com/user/[username]
    if (input.includes("user/")) {
        input = input.split("user/")[1];
    }
    // calls youtube api to look up username
    var response = await google.youtube("v3").channels.list({
        key: googleAPIKey,
        forUsername: input,
        part: "id"
    });
    if (response.data && response.data.items && response.data.items[0] && response.data.items[0].id) {
        return response.data.items[0].id;
    }
}

/**
 * checks if youtube channel even exists
 *
 * @export
 * @param {string} YTChannelID youtube channel id
 * @returns if actually exists
 */
export async function YTChannelExists(YTChannelID: string) {
    // calls youtube api to look up channel id
    var response = await google.youtube("v3").channels.list({
        key: googleAPIKey,
        id: YTChannelID,
        part: "id"
    });
    if (response.data && response.data.items && response.data.items[0]) return true;
    return false;
}

/**
 * adds catcher layers to the given express application
 * Layers:
 *  - middelware layer for application/atom+xml parser
 *  - get layer for verification
 *  - post application for a actual callback
 *
 * @export
 * @param {express.Application} app express application
 */
export function addYoutubeCatcher(app: express.Application) {
    // middelware parser
    app.use(callbackPath + '/youtube', bodyParser.text({ type: 'application/atom+xml' }));
    // get layer
    app.get(callbackPath + '/youtube', (req, res) => {
        res.status(200).send(req.query['hub.challenge']);
    });
    // post layer
    app.post(callbackPath + '/youtube', function (req, res) {
        // parse xml body
        xmlParser.parseString(req.body, async (error, result) => {
            // checks if error occurred and if so return a 422 code 
            if (error) {
                res.status(422).json({ code: 'xml_parse_error', details: "Something went wrong while parsing the XML", error });
            } else {
                var video = result.feed.entry
                if (!video || !video.updated || !video.published || !video["yt:videoId"] || !video.author || !video["yt:channelId"]) {
                    res.sendStatus(400);
                    return;
                }
                // checks if a new video was published or a old one was updated
                var publishUpdateDifference = Date.parse(video.updated) - Date.parse(video.published)
                const type = (publishUpdateDifference > 300000) ? 'updated' : 'published'
                // bot will only notify of new videos
                if (type != "published") {
                    res.sendStatus(200);
                    return;
                }
                // gets webhook docs
                var webhookDocs = await Bot.youtube.webhooks.find({ feed: video["yt:channelId"] }).exec();
                if (webhookDocs.length == 0) {
                    res.sendStatus(404);
                    return;
                }

                const link = "https://youtu.be/" + video["yt:videoId"];
                // runs through all subscriptions for that youtube channel
                for (const webhookDoc of webhookDocs) {
                    const webhookObject: webhookObject = webhookDoc.toObject();
                    var guild = Bot.client.guilds.get(webhookObject.guild);
                    if (!guild) {
                        console.warn("in youtube webhookcatcher guild " + webhookObject.guild + " wasn't found");
                        webhookDoc.remove();
                    }
                    // gets channel to send notification in
                    var channel: any = guild.channels.get(webhookObject.channel);
                    if (!channel) webhookDoc.remove();
                    var message: string = webhookObject.message;
                    // replaces {{link}}, {{title}}, {{channelName}}, {{channelLink}}
                    message = message.replace("{{link}}", link).replace("{{title}}", video.title).replace("{{channelName}}", video.author.name).replace("{{channelLink}}", video.author.uri);
                    if (message.includes("{{role:")) { // sends to special mention if needed
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

/**
 * manages all youtube webhooks. Connects to webhooks database and uses the youtube collection. Also sends requests to pubsubhubbub if needed.
 *
 * @export
 * @class YTWebhookManager
 */
export class YTWebhookManager {
    /**
     * connection to webhooks database
     *
     * @type {mongoose.Connection}
     * @memberof YTWebhookManager
     */
    connection: mongoose.Connection;
    /**
     * model for youtube collection
     *
     * @type {mongoose.Model<webhookDoc>}
     * @memberof YTWebhookManager
     */
    webhooks: mongoose.Model<webhookDoc>;

    /**
     *Creates an instance of YTWebhookManager.
     * @param {string} URI database URL with auth already in it
     * @param {string} authDB name of auth database
     * @memberof YTWebhookManager
     */
    constructor(URI: string, authDB: string) {
        this.connection = mongoose.createConnection(URI + '/webhooks' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        this.connection.on('error', console.error.bind(console, 'connection error:'));
        this.connection.once('open', function () {
            console.log('connected to /webhooks database');
        });
        this.webhooks = this.connection.model("youtubeWebhook", webhookSchema, "youtube");
    }

    /**
     * getter for webhooks with a webhookID
     *
     * @param {mongoose.Schema.Types.ObjectId} webhookID
     * @returns
     * @memberof YTWebhookManager
     */
    get(webhookID: mongoose.Schema.Types.ObjectId) {
        return this.webhooks.findById(webhookID).exec();
    }

    /**
     * sends a post to pubsubhubbub to sub to a callback
     *
     * @private
     * @param {string} YTChannelID channel to create a sub in
     * @param {boolean} subscribe if to sub or unsub
     * @returns
     * @memberof YTWebhookManager
     */
    private async subToChannel(YTChannelID: string, subscribe: boolean) {
        return new Promise((resolve, reject) => {
            request.post('https://pubsubhubbub.appspot.com/subscribe', {
                form: {
                    'hub.mode': subscribe ? 'subscribe' : 'unsubscribe',
                    'hub.callback': `http://${callbackURL}:${callbackPort}${callbackPath}/youtube`, // uses in bot-config specified callback URL
                    'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=' + YTChannelID,
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

    /**
     * creates webhook in database and also calls subToChannel if it0s the first time writing
     *
     * @param {string} guildID id of guild where the webhook should be made
     * @param {string} channelID id for channel to witch the webhook should send
     * @param {string} YTChannelID id of youtube channel to which to sub
     * @param {string} message message that should get send on callback
     * @returns created webhook doc
     * @memberof YTWebhookManager
     */
    async createWebhook(guildID: string, channelID: string, YTChannelID: string, message: string) {
        var sameFeedWebhook = await this.webhooks.findOne({ feed: YTChannelID }); // searches for a webhook with same feed to know if it should sub to subpubhubbub
        if (sameFeedWebhook && sameFeedWebhook.guild == guildID && sameFeedWebhook.channel == channelID) return undefined; // checks if similar webhook already exists and if so then return
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
        var webhhookDoc = new this.webhooks({ // creates webhook doc
            feed: YTChannelID,
            guild: guildID,
            channel: channelID,
            message: message
        });
        await webhhookDoc.save();
        if (!guildDoc.webhooks) guildDoc.webhooks = {};
        if (!guildDoc.webhooks.youtube) guildDoc.webhooks.youtube = [];
        guildDoc.webhooks.youtube.push(webhhookDoc.id); // adds webhook id to guild doc
        await guildDoc.save()
        Bot.mStats.logWebhookAction('youtube', 'created'); // logs action in mStats
        return webhhookDoc;
    }

    /**
     * deletes webhook form database and also unsubs from pubsubhubbub if it's the only webhook for specified channel
     *
     * @param {string} guildID guild where the webhook is
     * @param {string} channelID channel where webhook sends notification to
     * @param {string} YTChannelID id of youtube channel
     * @returns deleted webhook doc
     * @memberof YTWebhookManager
     */
    async deleteWebhook(guildID: string, channelID: string, YTChannelID: string) {
        var webhhookDoc = await this.webhooks.findOne({ feed: YTChannelID, guild: guildID, channel: channelID }).exec(); // searches for exact webhook
        if (!webhhookDoc) return undefined;
        var guildDoc = await Bot.database.findGuildDoc(guildID);
        if (!guildDoc) return undefined;
        guildDoc.webhooks.youtube.splice(guildDoc.webhooks.youtube.indexOf(webhhookDoc.id), 1); // removes webhook id of guild doc
        await guildDoc.save();

        var sameFeedWebhookCount = await this.webhooks.countDocuments({ feed: YTChannelID }).exec(); // counts webhooks with same feed to see if it need to unsub form pubsubhubbub
        if (sameFeedWebhookCount == 1) {
            try {
                this.subToChannel(YTChannelID, false);
            } catch (e) {
                console.error('error while unsubscribing to youtube webhook:', e);
                return null;
            }
        }
        Bot.mStats.logWebhookAction('youtube', 'deleted') // logs action in mStats
        return await webhhookDoc.remove();
    }

    /**
     * changes a property of a webhook.
     * If the feed gets changed, this function will delete the older webhook and create a new one
     *
     * @param {string} guildID id of guild where existing webhook is in
     * @param {string} channelID id of channel where the existing webhook sends notifications to
     * @param {string} YTChannelID youtube channel id of existing webhook
     * @param {string} [newChannelID] id of the new channel where to send notifications in
     * @param {string} [newYTChannelID] id of new youtube channel to sub to
     * @param {string} [newMessage] new message to send on callback
     * @returns updated webhook doc
     * @memberof YTWebhookManager
     */
    async changeWebhook(guildID: string, channelID: string, YTChannelID: string, newChannelID?: string, newYTChannelID?: string, newMessage?: string) {
        var webhhookDoc = await this.webhooks.findOne({ feed: YTChannelID, guild: guildID, channel: channelID }).exec(); // gets exact webhook doc
        if (!webhhookDoc) return undefined;
        Bot.mStats.logWebhookAction('youtube', 'changed');
        if (newYTChannelID) { // if there is a new feed it will delete the old one and create a new one
            var newWebhookDoc = await this.createWebhook(guildID, (newChannelID ? newChannelID : channelID),
                newYTChannelID, (newMessage ? newMessage : webhhookDoc.toObject().message)); // first try to create a new one
            if (!newWebhookDoc) return undefined;
            await this.deleteWebhook(guildID, channelID, YTChannelID)
            return newWebhookDoc;
        }
        if (newChannelID) { // changes channel where notifications gets send in
            webhhookDoc.channel = newChannelID;
        }
        if (newMessage) { // changes message for notification
            webhhookDoc.message = newMessage;
        }
        webhhookDoc.save();
        return webhhookDoc;
    }
}