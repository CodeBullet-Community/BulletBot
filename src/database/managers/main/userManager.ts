import { Client, Snowflake, UserResolvable } from 'discord.js';

import { Bot } from '../../..';
import { Commands } from '../../../commands';
import { Database } from '../../database';
import { UserObject, userSchema } from '../../schemas/main/user';
import { LoadOptions } from '../../wrappers/docWrapper';
import { UserWrapper } from '../../wrappers/main/userWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions } from '../collectionManager';


/**
 * Hold the user model
 *
 * @export
 * @class UserManager
 * @extends {CacheManager<UserObject>}
 */
export class UserManager extends CacheManager<UserObject, UserWrapper> {

    private readonly bot: Bot;
    private readonly commandModule: Commands;

    /**
     * Creates an instance of UserManager.
     * 
     * @param {Client} client Discord Client
     * @param {Database} database Database holding all database connections
     * @memberof UserManager
     */
    constructor(bot: Bot, database: Database, commandModule: Commands) {
        super(database, 'main', 'user', userSchema, UserWrapper);
        this.bot = bot;
        this.commandModule = commandModule;
    }

    /**
     * Generates a default user object with the provided user id
     *
     * @param {Snowflake} userID User id to generate a user object for
     * @returns
     * @memberof UserManager
     */
    getDefaultObject(userID: Snowflake) {
        return {
            id: userID,
            commandLastUsed: {}
        };
    };

    /**
     * Returns the userID unmodified
     *
     * @param {Snowflake} userID
     * @returns
     * @memberof UserManager
     */
    getCacheKey(userID: Snowflake) {
        return userID;
    }

    /**
     * Returns UserWrappers saved in cache
     *
     * @param {UserResolvable} user User to search cache for
     * @param {LoadOptions<UserObject>} [options] LoadOptions that should be passed to the wrapper
     * @returns
     * @memberof UserManager
     */
    get(user: UserResolvable, options?: LoadOptions<UserObject>) {
        let userID = this.bot.client.users.resolveID(user);
        return this.getCached(options, userID);
    }

    /**
     * Searched the database and cache for a UserObject. 
     * If one isn't found and it's specified in the options a new UserObject is created
     *
     * @param {UserResolvable} user user to search for
     * @param {FetchOptions<UserObject>} [options] FetchOptions
     * @returns UserWrapper for the UserObject
     * @memberof UserManager
     */
    async fetch(user: UserResolvable, options?: FetchOptions<UserObject>) {
        let userObj = await this.fetchResolve(user);
        return this._fetch([userObj.id], [userObj, this.commandModule], [userObj.id], options);
    }

    /**
     * Just like the UserManager.resolve() function from Discord.js, but which fetches not yet cached users
     *
     * @param {UserResolvable} user User resolvable to be resolved
     * @returns
     * @memberof UserManager
     */
    async fetchResolve(user: UserResolvable) {
        let userObj = this.bot.client.users.resolve(user);
        if (!userObj && typeof user === 'string')
            userObj = await this.bot.client.users.fetch(user);
        return userObj
    }

}