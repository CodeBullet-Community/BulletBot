import { Collection } from 'discord.js';
import { Schema } from 'mongoose';

import { Database } from '../database';
import { DocWrapper, LoadOptions } from '../wrappers/docWrapper';
import { CollectionManager, Constructor, FetchOptions } from './collectionManager';

/**
 * Extends CollectionManager and additionally caches and returns DocWrappers
 *
 * @export
 * @abstract
 * @class CacheManager
 * @extends {CollectionManager<Obj, Wrapper>}
 * @template Obj What object is in the collection and is wrapped
 * @template Wrapper Wrapper that wraps Obj
 */
export abstract class CacheManager<Obj extends Object, Wrapper extends DocWrapper<Obj>> extends CollectionManager<Obj, Wrapper> {

    /**
     * Cache holding all cached DocWrappers
     *
     * @protected
     * @type {Collection<string, Wrapper>}
     * @memberof CacheManager
     */
    protected cache: Collection<string, Wrapper>;

    /**
     * Creates an instance of CacheManager.
     * 
     * @param {Database} database Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<Obj>} schema Schema for this collection (should include default collection name)
     * @param {Constructor<Wrapper>} wrapper Wrapper constructor used when wrapping managed objects
     * @memberof CacheManager
     */
    constructor(database: Database, databaseName: string, modelName: string, schema: Schema<Obj>, wrapper: Constructor<Wrapper>) {
        super(database, databaseName, modelName, schema, wrapper);
        this.cache = new Collection();
    }

    /**
     * Get key of object for cache. Should be unique for every object
     *
     * @protected
     * @abstract
     * @param {*} args Arguments to change cache key
     * @returns {string} Key to use in cache
     * @memberof CacheManager
     */
    protected abstract getCacheKey(...args): string;

    /**
     * Searches cache and returns DocWrapper corresponding to cache key if it was cached.
     *
     * @protected
     * @param {LoadOptions<Obj>} options LoadOptions to pass to cached DocWrapper
     * @param {*} args Arguments to pass to getCacheKey function
     * @returns DocWrapper, if cached, loaded as specified
     * @memberof CacheManager
     */
    protected async getCached(options: LoadOptions<Obj>, ...args) {
        let cacheKey = this.getCacheKey(...args);
        let wrapper = this.cache.get(cacheKey);
        if (!wrapper) return undefined;
        if (options) await wrapper.load(options);
        return wrapper;
    }

    /**
     * Searches cache and returns searched DocWrapper
     *
     * @abstract
     * @param {*} args Query arguments and LoadOptions
     * @returns {Promise<DocWrapper<Obj>>} DocWrapper if found
     * @memberof CacheManager
     */
    abstract async get(...args): Promise<DocWrapper<Obj>>;

    /**
     * Helper function for fetch, that crates/takes a wrapper (new or cached) and passes it to this.fetchWithExistingWrapper() 
     *
     * @protected
     * @param {any[]} cacheKeyArgs Arguments for this.getCacheKey()
     * @param {any[]} wrapperArgs Arguments for the wrapper constructor
     * @param {any[]} defaultObjArgs Arguments for this.getDefaultObject()
     * @param {FetchOptions<Obj>} options Fetch options
     * @returns Output that this.fetch() should return
     * @memberof CacheManager
     */
    protected async _fetch(cacheKeyArgs: any[], wrapperArgs: any[], defaultObjArgs: any[], options: FetchOptions<Obj>) {
        let wrapper = await this.getCached(options, ...cacheKeyArgs);
        if (!wrapper)
            wrapper = new this.wrapper(this.model, ...wrapperArgs);
        return this.fetchWithExistingWrapper(wrapper, defaultObjArgs, options);
    }

    /**
     * Removes all wrappers form the cache where Wrapper.removed is true
     *
     * @returns How many cache entries have been removed
     * @memberof CacheManager
     */
    cleanCache() {
        let deleteCount = 0;
        for (const [key, wrapper] of this.cache.entries()) {
            if (!wrapper.removed) continue;
            this.cache.delete(key);
            deleteCount++;
        }
        return deleteCount;
    }
}