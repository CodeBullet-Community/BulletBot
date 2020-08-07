import { Client, Snowflake, UserResolvable } from 'discord.js';
import { singleton } from 'tsyringe';

import { MongoCluster } from '../../mongoCluster';
import { UserObject, userSchema } from '../../schemas/main/user';
import { LoadOptions } from '../../wrappers/docWrapper';
import { UserWrapper } from '../../wrappers/main/userWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions } from '../collectionManager';

/**
 * Types that are resolvable to a UserWrapper
 */
export type UserWrapperResolvable = UserWrapper | UserResolvable;

/**
 * Hold the user model
 *
 * @export
 * @class UserManager
 * @extends {CacheManager<UserObject>}
 */
@singleton()
export class UserManager extends CacheManager<UserObject, typeof UserWrapper, UserManager> {

    private readonly client: Client;

    /**
     * Creates an instance of UserManager.
     * 
     * @param {MongoCluster} cluster Database to get model from
     * @param {Client} client
     * @memberof UserManager
     */
    constructor(cluster: MongoCluster, client: Client) {
        super(cluster, 'main', 'user', userSchema, true, UserWrapper);
        this.client = client;
    }

    /**
     * Generates a default user object with the provided user id
     *
     * @param {Snowflake} userID User id to generate a user object for
     * @returns
     * @memberof UserManager
     */
    getDefaultObject(userID: Snowflake): UserObject {
        return {
            id: userID,
            commandLastUsed: {}
        };
    };

    /**   
     * @param {Snowflake} id User id
     * @returns
     * @memberof UserManager
     */
    getCacheKey(id: Snowflake) {
        return id;
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
        let userID = this.client.users.resolveID(user);
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
        if (!userObj) return undefined;
        return this._fetch(
            [userObj.id],
            [userObj],
            [userObj.id],
            options
        );
    }

    /**
     * Just like the UserManager.resolve() function from Discord.js, but which fetches not yet cached users
     *
     * @param {UserResolvable} user User resolvable to be resolved
     * @returns
     * @memberof UserManager
     */
    async fetchResolve(user: UserResolvable) {
        let userObj = this.client.users.resolve(user);
        if (!userObj && typeof user === 'string')
            userObj = await this.client.users.fetch(user);
        return userObj
    }

    /**
     * Resolves UserWrapperResolvable to a UserWrapper
     *
     * @param {UserWrapperResolvable} user Resolvable to resolve
     * @param {boolean} [fetch=false] If not cached GuildWrappers should be fetched
     * @returns
     * @memberof UserManager
     */
    async resolve(user: UserWrapperResolvable, fetch = false) {
        if (user instanceof UserWrapper) return user;
        if (fetch) return this.fetch(user);
        return this.get(user);
    }

    /**
     * Resolves UserWrapperResolvable to a user id
     *
     * @param {UserWrapperResolvable} user Resolvable to resolve
     * @returns {Snowflake}
     * @memberof UserManager
     */
    resolveId(user: UserWrapperResolvable): Snowflake {
        if (user instanceof UserWrapper) return user.id;
        return this.client.users.resolveID(user);
    }

}