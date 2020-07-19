import { Model, Schema } from 'mongoose';

import { MongoCluster } from '../mongoCluster';
import { ExDocument } from '../schemas/global';
import { AdvancedLoadOptions, DocWrapper, OptionalFields } from '../wrappers/docWrapper';

/**
 * Advanced fetch options for changing fetching behavior
 *
 * @export
 * @interface FetchOptions
 * @template Obj Object being fetched
 */
export interface AdvancedFetchOptions<Obj extends Object> extends AdvancedLoadOptions<Obj> {
    /**
     * If document should be created if not found
     *
     * @type {boolean}
     * @memberof FetchOptions
     */
    create?: boolean;
}

/**
 * Options defining what fields of a doc should be loaded and if it should be created if not found
 *
 * @export
 * @template Obj Object being fetched
 */
export type FetchOptions<Obj extends Object> = AdvancedFetchOptions<Obj> | OptionalFields<Obj>;

/**
 * Holds the model for a specific collection and the fetch function.
 *
 * @export
 * @abstract
 * @class CollectionManager
 * @template Obj What document is in the collection
 */
export abstract class CollectionManager<Obj extends object, Wrapper extends DocWrapper<Obj>, Manager extends CollectionManager<Obj, Wrapper, Manager>>{

    protected readonly cluster: MongoCluster;
    private readonly databaseName: string;
    protected readonly model: Model<ExDocument<Obj>>;

    /**
     * Creates an instance of CollectionManager.
     * 
     * @param {MongoCluster} cluster Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<Obj>} schema Schema for this collection (should include default collection name)
     * @memberof CollectionManager
     */
    constructor(cluster: MongoCluster, databaseName: string, modelName: string, schema: Schema<Obj>) {
        this.cluster = cluster;
        this.databaseName = databaseName;
        this.model = this.cluster.getConnection(this.databaseName).model(modelName, schema);
    }

    /**
     * Gets default object of this collection
     *
     * @abstract
     * @param {*} args Arguments that alter the default object
     * @returns {Obj} Default object based on arguments
     * @memberof CollectionManager
     */
    abstract getDefaultObject(...args): Obj;

    /**
     * Searches collection and returns found object. If provided it creates a new object if not found.
     *
     * @abstract
     * @param {*} args Search and fetch arguments
     * @returns {Promise<FetchObj>} Searched object
     * @memberof CollectionManager
     */
    abstract async fetch(...args): Promise<Wrapper>;

    /**
     * Helper function for fetch, which takes a wrapper, calls DocWrapper.load() and optional creates a doc
     *
     * @protected
     * @param {Wrapper} wrapper New/Existing DocWrapper
     * @param {any[]} defaultObjArgs Arguments for this.getDefaultObject()
     * @param {FetchOptions<Obj>} [options] Fetch options
     * @returns Output that this.fetch() should return
     * @memberof CollectionManager
     */
    protected async fetchWithExistingWrapper(
        wrapper: Wrapper,
        defaultObjArgs: Parameters<Manager["getDefaultObject"]>,
        options?: FetchOptions<Obj>
    ): Promise<Wrapper> {
        let loadedFields = await wrapper.load(options);
        if (loadedFields === undefined && (<AdvancedFetchOptions<Obj>>options)?.create)
            await wrapper.createDoc(this.getDefaultObject(...defaultObjArgs), false);
        return wrapper;
    }

}