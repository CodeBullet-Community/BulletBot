import { Snowflake } from 'discord.js';
import { Schema } from 'mongoose';

import { CommandName } from '../../../commands';
import { GuildWrapper } from '../../wrappers/main/guildWrapper';
import { UserWrapper } from '../../wrappers/main/userWrapper';
import { ExDocument } from '../global';

/**
 * Object holding data for GuildMember saved by BulletBot
 */
export interface BBGuildMember {
    /**
     * User which is a member
     *
     * @type {(Snowflake | UserWrapper)}
     * @memberof BBGuildMember
     */
    user: Snowflake | UserWrapper;
    /**
     * Guild which member is in
     *
     * @type {(Snowflake | GuildWrapper)}
     * @memberof BBGuildMember
     */
    guild: Snowflake | GuildWrapper;
    /**
     * When which command was last used
     *
     * @memberof BBGuildMember
     */
    commandLastUsed: {
        [Command in CommandName]?: number;
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