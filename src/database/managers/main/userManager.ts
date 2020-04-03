import { Client, UserResolvable } from 'discord.js';

import { Bot } from '../../..';
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
export class UserManager extends CacheManager<UserObject> {

    private readonly bot: Bot;

    /**
     * Creates an instance of UserManager.
     * 
     * @param {Client} client Discord Client
     * @param {Database} database Database holding all database connections
     * @memberof UserManager
     */
    constructor(bot: Bot, database: Database) {
        super(database, 'main', 'user', userSchema);
        this.bot = bot;
    }

    /**
     * Generates a default user object with the provided user id
     *
     * @param {string} userID User id to generate a user object for
     * @returns
     * @memberof UserManager
     */
    getDefaultObject(userID: string) {
        return {
            id: userID,
            commandLastUsed: {}
        };
    };

    /**
     * Returns the userID unmodified
     *
     * @param {string} userID
     * @returns
     * @memberof UserManager
     */
    getCacheKey(userID: string) {
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
        let cacheKey = this.getCacheKey(userID);
        return this.getCached(cacheKey, options);
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
        let userObj = this.bot.client.users.resolve(user);
        let cacheKey = this.getCacheKey(userObj.id);

        let wrapper = await this.getCached(cacheKey, options);
        if (!wrapper)
            wrapper = new UserWrapper(this.model, userObj);

        let loadedFields = await wrapper.load({ fields: options.fields, reload: true });
        if (loadedFields === undefined && options?.create)
            await wrapper.createDoc(this.getDefaultObject(userObj.id), false);

        return wrapper;
    }

}