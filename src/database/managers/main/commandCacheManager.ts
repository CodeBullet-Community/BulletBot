import { ChannelResolvable, Client, DMChannel, Snowflake, TextChannel } from 'discord.js';
import { singleton } from 'tsyringe';

import { MongoCluster } from '../../mongoCluster';
import { CommandCacheObject, commandCacheSchema } from '../../schemas/main/commandCache';
import { LoadOptions } from '../../wrappers/docWrapper';
import { CommandCacheWrapper } from '../../wrappers/main/commandCacheWrapper';
import { CacheManager } from '../cacheManager';
import { AdvancedFetchOptions, FetchOptions } from '../collectionManager';
import { UserManager, UserWrapperResolvable } from './userManager';

/**
 * Manages all command caches
 *
 * @export
 * @class CommandCacheManager
 * @extends {CacheManager<CommandCacheObject, typeof CommandCacheWrapper, CommandCacheManager>}
 */
@singleton()
export class CommandCacheManager extends CacheManager<CommandCacheObject, typeof CommandCacheWrapper, CommandCacheManager>{

    private readonly userManager: UserManager;
    private readonly client: Client;

    /**
     * Creates an instance of CommandCacheManager.
     * 
     * @param {MongoCluster} cluster
     * @param {UserManager} userManager
     * @param {Client} client
     * @memberof CommandCacheManager
     */
    constructor(cluster: MongoCluster, userManager: UserManager, client: Client) {
        super(cluster, 'main', 'commandCache', commandCacheSchema, CommandCacheWrapper);
        this.userManager = userManager;
        this.client = client;
    }

    /**
     * Just returns null. This manager does not support the AdvancedFetchOptions.create option.
     *
     * @returns
     * @memberof CommandCacheManager
     */
    getDefaultObject() {
        return null;
    }

    /**
     * @param {Snowflake} channelId Channel id
     * @param {Snowflake} userId User id
     * @returns
     * @memberof CommandCacheManager
     */
    getCacheKey(channelId: Snowflake, userId: Snowflake) {
        return `${channelId}.${userId}`
    }

    /**
     * Return CommandCacheWrappers saved in cache
     *
     * @param {ChannelResolvable} channel
     * @param {UserWrapperResolvable} user
     * @param {LoadOptions<CommandCacheObject>} [options]
     * @returns
     * @memberof CommandCacheManager
     */
    get(channel: ChannelResolvable, user: UserWrapperResolvable, options?: LoadOptions<CommandCacheObject>) {
        let channelId = this.client.channels.resolveID(channel);
        let userId = this.userManager.resolveId(user);
        return this.getCached(options, channelId, userId);
    }

    /**
     * Searches the database and cache for a CommandCacheWrapper.
     *
     * @param {ChannelResolvable} channel Channel cache is listening
     * @param {UserWrapperResolvable} user User cache is for
     * @param {FetchOptions<CommandCacheObject>} [options] Fetch options (include load options passed to wrapper)
     * @returns
     * @memberof CommandCacheManager
     */
    async fetch(channel: ChannelResolvable, user: UserWrapperResolvable, options?: FetchOptions<CommandCacheObject>) {
        if ((<AdvancedFetchOptions<CommandCacheObject>>options)?.create)
            throw new Error("The CommandCacheManager does not support the AdvancedFetchOptions.create option. Use CommandCacheWrapper.init() instead.");

        let channelObj = this.client.channels.resolve(channel);
        if (!(channelObj instanceof TextChannel || channelObj instanceof DMChannel))
            throw new Error('Invalid CommandCache channel type. Expected channel to be of type TextChannel or DMChannel.');
        let userWrapper = await this.userManager.resolve(user, true);

        return this._fetch(
            [channelObj.id, userWrapper.id],
            [channelObj, userWrapper],
            [],
            options
        );
    }

}