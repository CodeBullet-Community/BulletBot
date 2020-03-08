import { Snowflake } from "discord.js";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Raw BotSuggestion object from the database
 */
export interface BotSuggestionObject {
    guild?: Snowflake; // guild ID where it was suggested (optional)
    user: Snowflake; // user ID which suggested it
    suggestion: string; // suggestion description
}
/**
 * Mongoose Document for BotSuggestionObject
 */
export type BotSuggestionDoc = ExDocument<BotSuggestionObject>;
/**
 * Schema for BotSuggestionObject
 */
export const botSuggestionSchema = new Schema({
    guild: { type: String, required: false },
    user: String,
    suggestion: String,
}, { collection: 'suggestions' });