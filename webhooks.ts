import { youtubeWebhookManager, YoutubeManager } from "./webhooks/youtube";
import { bot } from ".";
import { Guild, GuildChannel } from "discord.js";
import { webhookInterface } from "./Database";

export interface webhookManager {
    name: string;
    createWebhook: (bot: bot, guild: Guild, channel: GuildChannel, URL: string) => Promise<webhookInterface>;
    deleteWebhook: (bot: bot, guild: Guild, channel: GuildChannel, URL: string) => Promise<webhookInterface>;
    changeWebhook: (bot: bot, guild: Guild, channel: GuildChannel, URL: string, newChannel?: GuildChannel, newURL?: string) => Promise<webhookInterface>;
}
export default class Webhooks {
    youtube: youtubeWebhookManager;
    constructor() {
        this.youtube = YoutubeManager;
    }
}