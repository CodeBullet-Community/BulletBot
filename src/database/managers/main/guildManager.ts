import { Client, GuildResolvable, Snowflake } from 'discord.js';
import { singleton } from 'tsyringe';

import { MongoCluster } from '../../mongoCluster';
import { GuildObject, guildSchema } from '../../schemas/main/guild';
import { LoadOptions } from '../../wrappers/docWrapper';
import { GuildWrapper } from '../../wrappers/main/guildWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions } from '../collectionManager';

/**
 * Types that are resolvable to a GuildWrapper
 */
export type GuildWrapperResolvable = GuildWrapper | GuildResolvable;

/**
 * Hold the guild model
 *
 * @export
 * @class GuildManager
 * @extends {CacheManager<GuildObject, GuildWrapper>}
 */
@singleton()
export class GuildManager extends CacheManager<GuildObject, typeof GuildWrapper, GuildManager> {

    private readonly client: Client;

    /**
     * Creates an instance of GuildManager.
     * 
     * @param {MongoCluster} cluster
     * @param {Client} client
     * @memberof GuildManager
     */
    constructor(cluster: MongoCluster, client: Client) {
        super(cluster, 'main', 'guildMember', guildSchema, GuildWrapper);
        this.client = client;
    }

    /**
     * Generates a default guild object with the provided guild id
     *
     * @param {Snowflake} id Guild id
     * @returns
     * @memberof GuildManager
     */
    getDefaultObject(id: Snowflake): GuildObject {
        return {
            id: id,
            totalCases: 0,
            locks: {},
            ranks: {
                admin: [],
                mod: [],
                immune: []
            },
            commandSettings: {},
            megalog: { ignoreChannels: [] }
        };
    }

    /**
     * @param {Snowflake} id Guild id
     * @returns
     * @memberof GuildManager
     */
    getCacheKey(id: Snowflake) {
        return id;
    }

    /**
     * Returns GuildWrappers saved in cache
     *
     * @param {GuildResolvable} guild Guild to search cache for
     * @param {LoadOptions<GuildObject>} [options] LoadOptions that should be passed to the wrapper
     * @returns
     * @memberof GuildManager
     */
    get(guild: GuildResolvable, options?: LoadOptions<GuildObject>) {
        let id = this.client.guilds.resolveID(guild);
        return this.getCached(options, id);
    }

    /**
     * Searches the database and cache for a GuildObject.
     *
     * @param {GuildResolvable} guild Guild to search for
     * @param {FetchOptions<GuildObject>} [options] Fetch options (include load options passed to wrapper)
     * @returns
     * @memberof GuildManager
     */
    async fetch(guild: GuildResolvable, options?: FetchOptions<GuildObject>) {
        let guildObj = this.client.guilds.resolve(guild);
        return this._fetch(
            [guildObj.id],
            [guildObj],
            [guildObj.id],
            options
        );
    }

    /**
     * Resolves GuildWrapperResolvable to a GuildWrapper
     *
     * @param {GuildWrapperResolvable} guild Resolvable to resolve
     * @param {boolean} [fetch=false] If not cached GuildWrappers should be fetched
     * @returns
     * @memberof GuildManager
     */
    async resolve(guild: GuildWrapperResolvable, fetch = false) {
        if (guild instanceof GuildWrapper) return guild;
        if (fetch) return this.fetch(guild, { fields: [] });
        return this.get(guild, { fields: [] });
    }

    /**
     * Resolves GuildWrapperResolvable to the guild id
     *
     * @param {GuildWrapperResolvable} guild Resolvable to resolve
     * @returns {Snowflake}
     * @memberof GuildManager
     */
    resolveId(guild: GuildWrapperResolvable): Snowflake {
        if (guild instanceof GuildWrapper) return guild.id;
        return this.client.guilds.resolveID(guild);
    }

}