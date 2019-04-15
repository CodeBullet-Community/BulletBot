import { youtubeWebhookManager, YoutubeManager } from "./webhooks/youtube";
import { bot } from ".";
import { Guild, Channel } from "discord.js";
import { webhookInterface } from "./Database";

export interface webhookManager {
    name: string;
    createWebhook: (bot: bot, guild: Guild, channel: Channel, URL: string, message: string) => Promise<webhookInterface>;
    deleteWebhook: (bot: bot, guild: Guild, channel: Channel, URL: string) => Promise<{ feed: string, guild: string, channel: string, message: string }>;
    changeWebhook: (bot: bot, guild: Guild, channel: Channel, URL: string, newChannel?: Channel, newURL?: string, newMessage?: string) => Promise<webhookInterface>;
}
export default class Webhooks {
    youtube: youtubeWebhookManager;
    serviceNames:string[];
    constructor() {
        this.youtube = YoutubeManager;
        this.serviceNames = [this.youtube.name];
    }
}