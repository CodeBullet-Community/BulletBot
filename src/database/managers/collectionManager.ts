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
     * If document should be created if not found (Default true)
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
 * Adds the .create() method definition for if the object needs to manually be created
 *
 * @export
 * @interface ManualCreate
 * @template Wrapper
 */
export interface ManualCreate<Wrapper extends DocWrapper<any>> {
    /**
     * Creates a new object with the provided parameters. 
     * Overwrites old already existing objects.
     *
     * @param {...any[]} args
     * @returns {Promise<Wrapper>}
     * @memberof ManualCreate
     */
    create(...args: any[]): Promise<Wrapper>;
}

/**
 * Holds the model for a specific collection and the fetch function.
 *
 * @export
 * @abstract
 * @class CollectionManager
 * @template Obj What document is in the collection
 */
export abstract class CollectionManager<Obj extends object, Wrapper extends DocWrapper<Obj>, Manager extends CollectionManager<Obj, Wrapper, Manager>>{


    /**
     * Name of database this manager is connected with
     *
     * @private
     * @type {string}
     * @memberof CollectionManager
     */
    private readonly databaseName: string;
    /**
     * Model of document this manager manages
     *
     * @protected
     * @type {Model<ExDocument<Obj>>}
     * @memberof CollectionManager
     */
    protected readonly model: Model<ExDocument<Obj>>;
    /**
     * If the manager automatically creates a document if it doesn't exist
     *
     * @protected
     * @type {boolean}
     * @memberof CollectionManager
     */
    protected readonly autoCreate: boolean;

    protected readonly cluster: MongoCluster;

    /**
     * Creates an instance of CollectionManager.
     * 
     * @param {MongoCluster} cluster Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<Obj>} schema Schema for this collection (should include default collection name)
     * @param {boolean} autoCreate If new documents should be created automatically when they do not exist
     * @memberof CollectionManager
     */
    constructor(cluster: MongoCluster, databaseName: string, modelName: string, schema: Schema<Obj>, autoCreate: boolean) {
        this.cluster = cluster;
        this.databaseName = databaseName;
        this.model = this.cluster.getConnection(this.databaseName).model(modelName, schema);
        this.autoCreate = autoCreate;
    }

    /**
     * Gets default object of this collection
     *
     * @abstract
     * @param {*} args Arguments that alter the default object
     * @returns {Obj} Default object based on arguments
     * @memberof CollectionManager
     */
    getDefaultObject?(...args): Obj;

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
     * Extracts option if wrapper should be automatically created
     *
     * @private
     * @param {FetchOptions<Obj>} [options] Options to extract from
     * @returns
     * @memberof CollectionManager
     */
    private extractIfCreate(options?: FetchOptions<Obj>) {
        if (typeof options !== 'object' || Array.isArray(options) || options?.create == null || !this.autoCreate) return this.autoCreate;
        return options.create;
    }

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
        if (loadedFields === undefined)
            if (this.extractIfCreate(options))
                await wrapper.createDoc(this.getDefaultObject(...defaultObjArgs), false);
            else
                return undefined;
        return wrapper;
    }

}