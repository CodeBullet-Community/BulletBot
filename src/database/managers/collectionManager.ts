import { Model, Schema } from 'mongoose';

import { Database } from '../database';
import { ExDocument, OptionalFields } from '../schemas/global';
import { AdvancedLoadOptions, DocWrapper } from '../wrappers/docWrapper';

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
 * Defines any constructor of class Class
 * 
 * @export
 * @template Class 
 */
export type Constructor<Class> = new (...args: any[]) => Class;

/**
 * Holds the model for a specific collection and the fetch function.
 *
 * @export
 * @abstract
 * @class CollectionManager
 * @template Obj What document is in the collection
 */
export abstract class CollectionManager<Obj extends Object, Wrapper extends DocWrapper<Obj>>{

    protected readonly database: Database;
    private readonly databaseName: string;
    protected readonly model: Model<ExDocument<Obj>>;
    protected readonly wrapper: Constructor<Wrapper>;

    /**
     * Creates an instance of CollectionManager.
     * 
     * @param {Database} database Database class to get connection
     * @param {string} databaseName Name of database the collection is in
     * @param {string} modelName Name of the model
     * @param {Schema<Obj>} schema Schema for this collection (should include default collection name)
     * @param {Constructor<Wrapper>} wrapper
     * @memberof CollectionManager
     */
    constructor(database: Database, databaseName: string, modelName: string, schema: Schema<Obj>, wrapper: Constructor<Wrapper>) {
        let connection = this.database.getConnection(this.databaseName);
        this.database = database;
        this.databaseName = databaseName;
        this.model = connection.model(modelName, schema);
        this.wrapper = wrapper;
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
    abstract async fetch(...args): Promise<DocWrapper<Obj>>;

    /**
     * Helper function for fetch, which takes a wrapper, calls DocWrapper.load() and optional creates a doc
     *
     * @protected
     * @param {Wrapper} wrapper New/Existing DocWrapper
     * @param {any[]} defaultObjArgs Arguments for this.getDefaultObject()
     * @param {FetchOptions<Obj>} options Fetch options
     * @returns Output that this.fetch() should return
     * @memberof CollectionManager
     */
    protected async fetchWithExistingWrapper(wrapper: Wrapper, defaultObjArgs: any[], options: FetchOptions<Obj>) {
        let loadedFields = await wrapper.load(options);
        // @ts-ignore
        if (loadedFields === undefined && options?.create)
            await wrapper.createDoc(this.getDefaultObject(...defaultObjArgs), false);
        return wrapper;
    }

}