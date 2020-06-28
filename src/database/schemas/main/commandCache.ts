import { Snowflake, DMChannel, TextChannel, User } from "discord.js";
import { CommandName, commandInterface } from "../../../commands";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Holds cache data for commands in between messages from user
 */
export interface CommandCache {
    /**
     * Channel the command originally was executed
     *
     * @type {(Snowflake | DMChannel | TextChannel)}
     * @memberof CommandCache
     */
    channel: Snowflake | DMChannel | TextChannel;
    /**
     * User that executed the command
     *
     * @type {(Snowflake | User)}
     * @memberof CommandCache
     */
    user: Snowflake | User;
    /**
     * Command that was executed
     *
     * @type {(CommandName | commandInterface)}
     * @memberof CommandCache
     */
    command: CommandName | commandInterface;
    /**
     * Permission level command was executed at
     *
     * @type {number}
     * @memberof CommandCache
     */
    permLevel: number;
    /**
     * Cache saved by command
     *
     * @type {*}
     * @memberof CommandCache
     */
    cache: any;
    /**
     * When this cache expires
     *
     * @type {(number | Date)}
     * @memberof CommandCache
     */
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