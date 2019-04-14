import { webhookManager } from "../webhooks";
import request = require("request");

export interface youtubeWebhookManager extends webhookManager {
    getChannelID: (URL: string) => Promise<string>;
}

function promiseRequest(url): Promise<any> {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    });
}

export var YoutubeManager: youtubeWebhookManager = { name: null, getChannelID: null, createWebhook: null, deleteWebhook: null, changeWebhook: null };

YoutubeManager.name = "youtube";
YoutubeManager.getChannelID = async function (input: string) {
    if (input.includes("channel/")) {
        return input.split("channel/")[1];
    }
    if (input.includes("user/"){
        input = input.split("user/")[1];
    }
    var body = JSON.parse(await promiseRequest("https://www.googleapis.com/youtube/v3/channels?key=AIzaSyA3AOZAkygCqX83lpstwAgl9mPfCCKSMwg&forUsername=" + input + "&part=id"));
    if (body && body.items && body.items[0] && body.items[0].id) {
        return body.items[0].id;
    }
    return null;
}
