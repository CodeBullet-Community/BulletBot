import { Snowflake } from "discord.js";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Raw Bug object from the database
 */
export interface BugObject {
    guild?: Snowflake; // guild ID where it was reported (optional)
    user: Snowflake; // user ID which reported it
    bug: string; // bug description
}
/**
 * Mongoose Document for BugObject
 */
export type BugDoc = ExDocument<BugObject>;
/**
 * Schema for BugObject
 */
export const bugSchema = new Schema({
    guild: { type: String, required: false },
    user: String,
    bug: String,
}, { collection: 'bugs' });