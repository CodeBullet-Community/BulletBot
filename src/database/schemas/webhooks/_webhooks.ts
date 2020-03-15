import { Snowflake } from "discord.js";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Raw Webhook object for all webhooks
 */
export interface WebhookObject {
    feed: string;
    guild: Snowflake;
    channel: Snowflake;
    message: string;
}
/**
 * Mongoose Document for WebhookObject
 */
export type WebhookDoc = ExDocument<WebhookObject>;
/**
 * Schema for WebhookObject
 */
export const webhookSchema = new Schema({
    feed: String,
    guild: String,
    channel: String,
    message: String
});