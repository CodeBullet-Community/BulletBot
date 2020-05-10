import { Snowflake } from "discord.js";
import { Schema } from "mongoose";
import { ExDocument } from "../global";
import { WebhookService, MegalogFunction } from "./guild";
import { ObjectId } from "mongodb";
import { CommandName } from "../../../commands";

/**
 * Object representing raw data of a log entry from the database
 */
export interface LogObject {
    guild: Snowflake;
    action: number;
    mod: Snowflake;
    timestamp: number;
    info?: LogStaffInfo | LogWebhookInfo | LogFilterInfo | LogCommandInfo | LogPrefixInfo | LogMegalogInfo | LogMegalogIgnoreInfo;
}
/**
 * Mongoose Document for LogObject
 */
export type LogDoc = ExDocument<LogObject>;
/**
 * Schema for LogObject
 */
export const logSchema = new Schema({
    guild: String,
    action: Number,
    mod: String,
    timestamp: Number,
    info: Schema.Types.Mixed
}, { collection: 'logs' });

/**
 * unified way of saying if something was added, removed or changed
 *
 * @export
 * @enum {number}
 */
export enum LogAction {
    Add = 0,
    Remove = 1,
    change = 2
}

/**
 * defines what was specifically changed
 *
 * @export
 * @enum {number}
 */
export enum LogType {
    Staff = 0,
    Webhook = 1,
    Filter = 2,
    Command = 3,
    Prefix = 4,
    Megalog = 5,
    MegalogIgnore = 6
}


/**
 * Log when a User or Role gets added or removed from a GuildRank
 */
export interface LogStaffObject extends LogObject {
    info: LogStaffInfo;
}
/**
 * Log info when a User or Role gets added or removed from a GuildRank
 */
export interface LogStaffInfo {
    type: LogAction.Add | LogAction.Remove; // add or remove
    rank: 'admins' | 'mods' | 'immune';
    role?: Snowflake; // role id
    user?: Snowflake; // user id
}

/**
 * Log when webhook gets added, removed or changed
 */
export interface LogWebhookObject extends LogObject {
    info: LogWebhookInfo;
}
/**
 * Log info when webhook gets added, removed or changed
 */
export interface LogWebhookInfo {
    type: LogAction; // add, remove or change
    service: WebhookService; // service name
    webhookID: ObjectId; // doc id
    changedChannel?: boolean; // if channel was changed
    changedMessage?: boolean; // if message was changed
}

/**
 * Log when command gets enabled or disabled
 */
export interface LogCommandObject extends LogObject {
    info: LogCommandInfo;
}
/**
 * Log info when command gets enabled or disabled
 */
export interface LogCommandInfo {
    type: LogAction.Add | LogAction.Remove; // add, remove or change
    command: CommandName; // command name
}

/**
 * Log when command gets enabled or disabled
 */
export interface LogCommandObject extends LogObject {
    info: LogCommandInfo;
}
/**
 * Log info when new custom prefix gets set
 */
export interface LogPrefixInfo {
    old: string,
    new: string
}

/**
 * Log when megalog functions get enabled or disabled
 */
export interface LogMegalogObject extends LogObject {
    info: LogMegalogInfo;
}
/**
 * Log info when megalog functions get enabled or disabled
 */
export interface LogMegalogInfo {
    type: LogAction.Add | LogAction.Remove; // add/remove
    functions: MegalogFunction[]; // functions enabled/disabled
    channel?: Snowflake // channel ID
}

/**
 * Log when a channel gets added to the megalog ignore list
 */
export interface LogMegalogIgnoreObject extends LogObject {
    info: LogMegalogIgnoreInfo;
}
/**
 * Log info when a channel gets added to the megalog ignore list
 */
export interface LogMegalogIgnoreInfo {
    type: LogAction.Add | LogAction.Remove; // add/remove
    channel?: Snowflake // channel ID
}