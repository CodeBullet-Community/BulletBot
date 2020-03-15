import { Snowflake, DMChannel, TextChannel, User } from "discord.js";
import { CommandName, commandInterface } from "../../../commands";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Holds cache data for commands in between messages from user
 */
export interface CommandCache {
    channel: Snowflake | DMChannel | TextChannel;
    user: Snowflake | User;
    command: CommandName | commandInterface;
    permLevel: number;
    cache: any;
    expirationTimestamp: number | Date;
}
/**
 * Holds raw cache data from the database for commands in between messages from user
 */
export interface CommandCacheObject extends CommandCache {
    channel: Snowflake;
    user: Snowflake;
    command: CommandName;
    permLevel: number;
    cache: any;
    expirationTimestamp: number;
}
/**
 * Mongoose Document for CommandCacheObject
 */
export type CommandCacheDoc = ExDocument<CommandCacheObject>;
/**
 * Schema for CommandCacheObject
 */
export const commandCacheSchema = new Schema({
    channel: String,
    user: String,
    command: String,
    permLevel: Number,
    cache: Schema.Types.Mixed,
    expirationTimestamp: Number
}, { collection: 'commandCaches' });