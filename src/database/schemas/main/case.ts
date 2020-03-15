import { Snowflake } from "discord.js";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Actions logged in Cases
 */
export enum CaseAction {
    Ban = 'ban',
    Warn = 'warn',
    Mute = 'mute',
    Kick = 'kick',
    Softban = 'softban',
    Unmute = 'unmute',
    Unban = 'unban'
};
export const caseActions = Object.values(CaseAction);

/**
 * Raw Case data from the database
 */
export interface CaseObject {
    guild: Snowflake;
    caseID: number;
    user: Snowflake;
    action: CaseAction;
    timestamp: number;
    duration?: number;
    mod: Snowflake;
    reason?: string;
}
/**
 * Mongoose Document for CaseObject
 */
export type CaseDoc = ExDocument<CaseObject>;
/**
 * Schema for CaseObject
 */
export const caseSchema = new Schema({
    guild: String,
    caseID: Number,
    user: String,
    action: String,
    timestamp: Number,
    duration: { type: Number, required: false },
    mod: String,
    reason: { type: String, required: false },
}, { collection: 'cases' });