import { Model, Schema } from 'mongoose';

import { Database } from '../database';
import { ExDocument, OptionalFields } from '../schemas/global';

/**
 * Options defining what fields of a searched doc should be loaded and if it should be created if not found
 *
 * @export
 * @interface FetchOptions
 * @template T
 */
export interface FetchOptions<T extends Object> {
    /**
     * If document should be created if not found
     *
     * @type {boolean}
     * @memberof FetchOptions
     */
    create?: boolean,
    /**
     * What fields should be loaded
     *
     * @type {OptionalFields<T>}
     * @memberof FetchOptions
     */
    fields?: OptionalFields<T>
}

/**
 * Holds the model for a specific collection and the fetch function.
 *
 * @export
 * @abstract
 * @class CollectionManager
 * @template T What document is in the collection
 * @template K What object gets returned with fetch
 */
export abstract class CollectionManager<T extends Object, K>{

    protected model: Model<ExDocument<T>>;

    /**
     * Creates an instance of CollectionManager.
     * 
     * @param {Database} database Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<T>} schema Schema for this collection (should include default collection name)
     * @memberof CollectionManager
     */
    constructor(protected database: Database, private databaseName: string, modelName: string, schema: Schema<T>) {
        let connection = this.database.getConnection(this.databaseName);
        this.model = connection.model(modelName, schema);
    }

    /**
     * Gets default object of this collection
     *
     * @abstract
     * @param {*} args Arguments that alter the default object
     * @returns {T} Default object based on arguments
     * @memberof CollectionManager
     */
    abstract getDefaultObject(...args): T;

    /**
     * Searches collection and returns found object. If provided it creates a new object if not found.
     *
     * @abstract
     * @param {*} args Search and fetch arguments
     * @returns {Promise<K>} Searched object
     * @memberof CollectionManager
     */
    abstract async fetch(...args): Promise<K>;

}