import { ChannelResolvable, Client, DMChannel, Snowflake, TextChannel } from 'discord.js';
import { singleton } from 'tsyringe';

import { CommandResolvable } from '../../../commands/command';
import { PermLevel } from '../../../utils/permissions';
import { MongoCluster } from '../../mongoCluster';
import { CommandCacheObject, commandCacheSchema } from '../../schemas/main/commandCache';
import { LoadOptions } from '../../wrappers/docWrapper';
import { CommandCacheWrapper } from '../../wrappers/main/commandCacheWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions, ManualCreate } from '../collectionManager';
import { UserManager, UserWrapperResolvable } from './userManager';

/**
 * Manages all command caches
 *
 * @export
 * @class CommandCacheManager
 * @extends {CacheManager<CommandCacheObject, typeof CommandCacheWrapper, CommandCacheManager>}
 */
@singleton()
export class CommandCacheManager extends CacheManager<CommandCacheObject, typeof CommandCacheWrapper, CommandCacheManager> implements ManualCreate<CommandCacheWrapper>{

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
        super(cluster, 'main', 'commandCache', commandCacheSchema, false, CommandCacheWrapper);
        this.userManager = userManager;
        this.client = client;
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
     * @param {LoadOptions<CommandCacheObject>} [options] Load options passed to the wrapper
     * @returns
     * @memberof CommandCacheManager
     */
    async fetch(channel: ChannelResolvable, user: UserWrapperResolvable, options?: LoadOptions<CommandCacheObject>) {
        let channelObj = await this.resolveCacheChannel(channel);
        let userWrapper = await this.userManager.resolve(user, true);

        if (!channelObj || !userWrapper) return undefined;
        return this._fetch(
            [channelObj.id, userWrapper.id],
            [channelObj, userWrapper],
            undefined,
            options
        );
    }

    /**
     * Creates a new CommandCache or overwrite an existing one.
     *
     * @param {ChannelResolvable} channel Channel to listen to
     * @param {UserWrapperResolvable} user User cache is for 
     * @param {CommandResolvable} command Command for the cache
     * @param {PermLevel} permLevel What permissions level this CommandCache executes with
     * @param {object} cache Object that should be cached
     * @param {number} expirationTimestamp When cache expires (default 10 sec later)
     * @returns The created CommandCacheWrapper
     * @memberof CommandCacheManager
     */
    async create(channel: ChannelResolvable, user: UserWrapperResolvable, command: CommandResolvable, permLevel: PermLevel, cache: object, expirationTimestamp: number) {
        let channelObj = await this.resolveCacheChannel(channel);
        let userWrapper = await this.userManager.resolve(user, true);

        let wrapper = new this.wrapper(this.model, channelObj, userWrapper);
        await wrapper.init(command, permLevel, cache, expirationTimestamp);
        this.set([channelObj.id, userWrapper.id], wrapper);

        return wrapper;
    }

    /**
     * Resolves a ChannelResolvable to either TextChannel or DMChannel.
     * If the channel is neither of those types it throws an error.
     *
     * @param {ChannelResolvable} channel Resolvable to resolve
     * @returns
     * @memberof CommandCacheManager
     */
    async resolveCacheChannel(channel: ChannelResolvable) {
        let channelObj = this.client.channels.resolve(channel);
        if (!(channelObj instanceof TextChannel || channelObj instanceof DMChannel))
            throw new Error('Invalid CommandCache channel type. Expected channel to be of type TextChannel or DMChannel.');
        return channelObj;
    }

}