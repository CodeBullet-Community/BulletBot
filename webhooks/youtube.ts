import { webhookManager } from "../webhooks";
import request = require("request");
import { bot } from "..";
import { Guild, Channel } from "discord.js";
import { googleApiKey as GOOGLE_API_KEY } from "../bot-config.json";
import { google } from "googleapis";

export interface youtubeWebhookManager extends webhookManager {
    getChannelID: (URL: string) => Promise<string>;
    channelExists: (channelID: string) => Promise<boolean>;
}

function promisePost(url, post): Promise<any> {
    return new Promise((resolve, reject) => {
        request.post(url, post, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 202) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    })
}

export var YoutubeManager: youtubeWebhookManager = { name: null, getChannelID: null, channelExists: null, createWebhook: null, deleteWebhook: null, changeWebhook: null };

YoutubeManager.name = "youtube";
YoutubeManager.getChannelID = async (input: string) => {
    if (input.includes("channel/")) {
        return input.split("channel/")[1];
    }
    if (input.includes("user/")) {
        input = input.split("user/")[1];
    }
    var response = await google.youtube("v3").channels.list({
        key: GOOGLE_API_KEY,
        forUsername: input,
        part: "id"
    });
    if (response.data && response.data.items && response.data.items[0] && response.data.items[0].id) {
        return response.data.items[0].id;
    }
    return input;
};
YoutubeManager.channelExists = async (channelID: string) => {
    var response = await google.youtube("v3").channels.list({
        key: GOOGLE_API_KEY,
        id: channelID,
        part: "id"
    });
    if (response.data && response.data.items && response.data.items[0]) return true;
    return false;
}

YoutubeManager.createWebhook = async (bot: bot, guild: Guild, channel: Channel, URL: string, message: string) => {
    var channelID = await YoutubeManager.getChannelID(URL);
    if (!YoutubeManager.channelExists(channelID)) return null;
    if (await bot.database.webhookDB.youtube.findOne({ feed: channelID, guild: guild.id, channel: channel.id })) return null;
    var existingWebhookDoc = await bot.database.webhookDB.youtube.findOne({ feed: channelID }).exec();
    // only create subscription when there isn't already one
    if (!existingWebhookDoc) {
        try {
            await promisePost('https://pubsubhubbub.appspot.com/subscribe', {
                form: {
                    'hub.mode': 'subscribe',
                    'hub.callback': `https://${bot.database.getGlobalSettings().callbackURL}/youtube`,
                    'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=' + channelID
                }
            });
        } catch (e) {
            console.error("error while creating youtube webhook:", e);
            return null;
        }
    }
    bot.mStatistics.logWebhookAction(bot, YoutubeManager.name, "creates");
    return await bot.database.createWebhook(guild, channel, YoutubeManager.name, channelID, message);
}

YoutubeManager.deleteWebhook = async (bot: bot, guild: Guild, channel: Channel, URL: string) => {
    var channelID = await YoutubeManager.getChannelID(URL);
    var allWebhookDocs = await bot.database.webhookDB.youtube.find({ feed: channelID }).exec();
    var webhookDoc = allWebhookDocs.find((doc, i, array) => {
        var object = doc.toObject();
        if (object.guild == guild.id && object.channel == channel.id) {
            return true;
        } else {
            return false;
        }
    });
    if (!webhookDoc) return null;
    // only delete subscription if it's the only webhook from that feed
    if (allWebhookDocs.length == 1 && webhookDoc) {
        try {
            await promisePost('https://pubsubhubbub.appspot.com/subscribe', {
                form: {
                    'hub.mode': 'unsubscribe',
                    'hub.callback': `https://${bot.database.getGlobalSettings().callbackURL}:${bot.database.getGlobalSettings().callbackPort}/webhooks/youtube`,
                    'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=' + channelID
                }
            });
        } catch (e) {
            console.error("error while deleting youtube webhook:", e);
        }
    }
    bot.mStatistics.logWebhookAction(bot, YoutubeManager.name, "deletes");
    return (await bot.database.deleteWebhook(YoutubeManager.name, webhookDoc._id));
}

YoutubeManager.changeWebhook = async (bot: bot, guild: Guild, channel: Channel, URL: string, newChannel?: Channel, newURL?: string, newMessage?: string) => {
    var channelID = await YoutubeManager.getChannelID(URL);
    var webhookDoc = await bot.database.findWebhook(guild, channel, YoutubeManager.name, channelID);
    if (!webhookDoc) {
        console.warn("webhook doc not found in changeWebhook() with properties:", { feed: channelID, guild: guild, channel: channel });
        return;
    }
    bot.mStatistics.logWebhookAction(bot, YoutubeManager.name, "changes");
    if (newURL) {
        var deleted = await YoutubeManager.createWebhook(bot, guild, (newChannel ? newChannel : channel), newURL, (newMessage ? newMessage : webhookDoc.toObject().message));
        if (!deleted) return null;
        await YoutubeManager.deleteWebhook(bot, guild, channel, channelID);
        return deleted;
    }
    if (newChannel) {
        webhookDoc.channel = newChannel.id;
    }
    if (newMessage) {
        webhookDoc.message = newMessage;
    }
    webhookDoc.save();
    return webhookDoc;
}
