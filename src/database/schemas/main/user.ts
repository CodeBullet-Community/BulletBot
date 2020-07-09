import { Snowflake } from 'discord.js';
import { Schema } from 'mongoose';

import { ExDocument } from '../global';
import { CommandName } from '../../../commands/command';

/**
 * Command scopes that are stored in the user object
 */
export type UserCommandScope = 'dm' | 'global'

/**
 * Object holding data for User saved by BulletBot
 */
export interface BBUser {
    /**
     * Id of the user
     *
     * @type {Snowflake}
     * @memberof UserObject
     */
    id: Snowflake;
    /**
     * When which command was used in each UserCommandScope
     *
     * @memberof UserObject
     */
    commandLastUsed: {
        [Scope in UserCommandScope]?: {
            [Command in CommandName]: number;
        };
    };
}

/**
 * Object holding data for User saved by BulletBot in the database
 */
export interface UserObject extends BBUser { }
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