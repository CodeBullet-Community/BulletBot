import { Collection } from 'discord.js';
import { Schema } from 'mongoose';

import { MongoCluster } from '../mongoCluster';
import { DocWrapper, LoadOptions } from '../wrappers/docWrapper';
import { CollectionManager, FetchOptions } from './collectionManager';

/**
 * Extends CollectionManager and additionally caches and returns DocWrappers
 *
 * @export
 * @abstract
 * @class CacheManager
 * @extends {CollectionManager<Obj, Wrapper, Manager>}
 * @template Obj What object is in the collection and is wrapped
 * @template WrapperConstructor Constructor of wrapper that wraps Obj
 * @template Manager Manager that extends the CacheManager
 * @template Wrapper Wrapper that wraps Obj (default instance type of WrapperConstructor)
 */
export abstract class CacheManager<
    Obj extends object,
    WrapperConstructor extends Constructor<Wrapper>,
    Manager extends CacheManager<Obj, WrapperConstructor, Manager, Wrapper>,
    Wrapper extends DocWrapper<Obj> = InstanceType<WrapperConstructor>
    > extends CollectionManager<Obj, Wrapper, Manager> {

    /**
     * Cache holding all cached DocWrappers
     *
     * @type {Collection<string, Wrapper}
     * @memberof CacheManager
     */
    cache: Collection<string, Wrapper>;
    /**
     * Constructor of wrapper
     *
     * @type {WrapperConstructor}
     * @memberof CacheManager
     */
    wrapper: WrapperConstructor;

    /**
     * Creates an instance of CacheManager.
     * 
     * @param {MongoCluster} cluster Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<Obj>} schema Schema for this collection (should include default collection name)
     * @param {WrapperConstructor} wrapper Constructor of wrapper to wrap object
     * @memberof CacheManager
     */
    constructor(cluster: MongoCluster, databaseName: string, modelName: string, schema: Schema<Obj>, wrapper: WrapperConstructor) {
        super(cluster, databaseName, modelName, schema);
        this.cache = new Collection();
        this.wrapper = wrapper;
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
    abstract getCacheKey(...args): string;

    /**
     * Searches cache and returns DocWrapper corresponding to cache key if it was cached.
     *
     * @protected
     * @param {LoadOptions<Obj>} options LoadOptions to pass to cached DocWrapper
     * @param {*} args Arguments to pass to getCacheKey function
     * @returns DocWrapper, if cached, loaded as specified
     * @memberof CacheManager
     */
    protected async getCached(options: LoadOptions<Obj>, ...args: Parameters<Manager['getCacheKey']>): Promise<Wrapper> {
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
     * @returns {Promise<Wrapper>} DocWrapper if found
     * @memberof CacheManager
     */
    abstract async get(...args): Promise<Wrapper>;

    /**
     * Helper function for fetch, that crates/takes a wrapper (new or cached) and passes it to this.fetchWithExistingWrapper() 
     *
     * @protected
     * @param {Parameters<Manager['getCacheKey']>} cacheKeyArgs Arguments for this.getCacheKey()
     * @param {RemoveFirstFromTuple<ConstructorParameters<WrapperConstructor>>} wrapperArgs Arguments for the wrapper constructor
     * @param {Parameters<Manager["getDefaultObject"]>} defaultObjArgs Arguments for this.getDefaultObject()
     * @param {FetchOptions<Obj>} [options] Fetch options
     * @returns Output that this.fetch() should return
     * @memberof CacheManager
     */
    protected async _fetch(
        cacheKeyArgs: Parameters<Manager['getCacheKey']>,
        wrapperArgs: RemoveFirstFromTuple<ConstructorParameters<WrapperConstructor>>,
        defaultObjArgs: Parameters<Manager["getDefaultObject"]>,
        options?: FetchOptions<Obj>
    ) {
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