import { Collection } from 'discord.js';
import { Schema } from 'mongoose';

import { Database } from '../database';
import { DocWrapper, LoadOptions } from '../wrappers/docWrapper';
import { CollectionManager } from './collectionManager';

/**
 * Extends CollectionManager and additionally caches and returns DocWrappers
 *
 * @export
 * @abstract
 * @class WrapperManager
 * @extends {CollectionManager<T, DocWrapper<T>>}
 * @template T What object is in the collection and is wrapped
 */
export abstract class WrapperManager<T extends Object> extends CollectionManager<T, DocWrapper<T>> {

    /**
     * Cache holding all cached DocWrappers
     *
     * @protected
     * @type {Collection<string, DocWrapper<T>>}
     * @memberof WrapperManager
     */
    protected cache: Collection<string, DocWrapper<T>>;

    /**
     * Creates an instance of WrapperManager.
     * 
     * @param {Database} database Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<T>} schema Schema for this collection (should include default collection name)
     * @memberof WrapperManager
     */
    constructor(database: Database, databaseName: string, modelName: string, schema: Schema<T>) {
        super(database, databaseName, modelName, schema);
        this.cache = new Collection();
    }

    /**
     * Get key of object for cache. Should be unique for every object
     *
     * @protected
     * @abstract
     * @param {*} args Arguments to change cache key
     * @returns {string} Key to use in cache
     * @memberof WrapperManager
     */
    protected abstract getCacheKey(...args): string;

    /**
     * Searches cache and returns DocWrapper corresponding to cache key if it was cached.
     *
     * @protected
     * @param {string} cacheKey Cache key to search in cache
     * @param {LoadOptions<T>} [options] LoadOptions to pass to cached DocWrapper (default does nothing)
     * @returns DocWrapper, if cached, loaded as specified
     * @memberof WrapperManager
     */
    protected async getCached(cacheKey: string, options?: LoadOptions<T>) {
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
     * @returns {Promise<DocWrapper<T>>} DocWrapper if found
     * @memberof WrapperManager
     */
    abstract async get(...args): Promise<DocWrapper<T>>;
}