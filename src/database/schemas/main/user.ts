import { Snowflake } from "discord.js";
import { CommandName } from "../../../commands";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

export type UserCommandScope = 'dm' | 'global'

/**
 * Object holding data that BulletBot stores about a User
 */
export interface UserObject {
    id: Snowflake; // user id
    commandLastUsed: {
        [Scope in UserCommandScope]?: {
            [Command in CommandName]: number; // timestamp until it can be reused again
        };
    };
}
/**
 * Mongoose Document for UserObject
 */
export type UserDoc = ExDocument<UserObject>;
/**
 * Schema for UserObject
 */
export const userSchema = new Schema({
    id: String,
    commandLastUsed: Schema.Types.Mixed
}, { id: false, collection: 'users' });