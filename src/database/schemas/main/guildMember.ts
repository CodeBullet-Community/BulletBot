import { Snowflake, User, Guild } from "discord.js";
import { CommandName } from "../../../commands";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Object holding data for GuildMember saved by BulletBot
 */
export interface BBGuildMember {
    user: Snowflake | User;
    guild: Snowflake | Guild;
    commandLastUsed: {
        [Command in CommandName]: number;
    };
}

/**
 * Object holding data for GuildMember saved in the database
 */
export interface GuildMemberObject extends BBGuildMember {
    user: Snowflake;
    guild: Snowflake;
}
/**
 * Mongoose Document for GuildMemberObject
 */
export type GuildMemberDoc = ExDocument<GuildMemberObject>;
/**
 * Schema for GuildMemberObject
 */
export const guildMemberSchema = new Schema({
    user: String,
    guild: String,
    commandLastUsed: Schema.Types.Mixed
}, { id: false, collection: 'users' });