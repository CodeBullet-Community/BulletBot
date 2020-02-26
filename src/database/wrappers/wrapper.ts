import { Schema, Model, Document, Query } from "mongoose";
import _ from "lodash";
import { ExDocument, Keys, OptionalFields, ObjectKey } from "../schemas";

/**
 * Wrapper for mongoDB documents. 
 * This class handles what part of the document is already loaded and 
 * general interfacing with the document on the database 
 *
 * @export
 * @class Wrapper
 * @template T
 */
export class Wrapper<T extends Object> {

    private readonly model: Model<ExDocument<T>>;
    private readonly uniqueQuery: any;
    private loadedFields: Keys<T>;
    private readonly allFields: Keys<T>;
    protected data: Partial<T>;
    removed: boolean;

    /**
     *Creates an instance of Wrapper.
     * @param {Model<T>} model Model of collection where the document is stored in
     * @param {*} uniqueQuery Query conditions for finding the document corresponding to the wrapper 
     * @param {Keys<T>} preloadedFields Fields that are already set by the extenders constructor
     * @param {Keys<T>} allFields Array of all the fields that the object can have (Use keys<T>() from 'ts-transformer-keys') to get them
     * @memberof Wrapper
     */
    constructor(model: Model<ExDocument<T>>, uniqueQuery: any, preloadedFields: Keys<T>, allFields: Keys<T>) {
        this.model = model;
        this.uniqueQuery = uniqueQuery;
        this.loadedFields = preloadedFields;
        this.allFields = allFields;
        this.data = {};
        this.allFields.forEach(key => this.setProperty(key));
        this.removed = false;
    }

    /**
     * Queries the database for the document corresponding to the wrapper
     *
     * @private
     * @param {Keys<T>} [fields] What parts of the document should be returned
     * @returns The document if it was found
     * @memberof Wrapper
     */
    protected getDoc(fields?: Keys<T>) {
        return this.model.findOne(this.uniqueQuery, fields ? fields.join(' ') : undefined).exec();
    }

    /**
     * Checks if the document corresponding to this wrapper exists
     *
     * @returns
     * @memberof Wrapper
     */
    async docExists() {
        return await this.getDoc([]) ? true : false;
    }

    /**
     * Creates a document for this wrapper with the provided content. 
     * By default it first checks if there is already a document and if so doesn't create one.
     * 
     * IMPORTANT: The wrapper doesn't check if the document is correct and can actually be found by it's uniqueQuery.
     *
     * @param {T} content The content of the document
     * @param {boolean} [overwrite=false] If it should overwrite the old document (Default false)
     * @returns The created document if it was created
     * @memberof Wrapper
     */
    async createDoc(content: T, overwrite = false) {
        let oldDocExists = await this.docExists();
        if (!overwrite && oldDocExists) return undefined;
        if (oldDocExists) await this.model.deleteOne(this.uniqueQuery).exec();
        let doc = new this.model(content);
        this.loadFromObject(content);
        return doc.save();
    }

    /**
     * Loads fields from a provided object. 
     * The object is seen as fully loaded, so undefined fields will also be used.
     *
     * @param {T} obj The object to load from
     * @param {boolean} [replace=true] If already loaded fields should be replaced
     * @returns The resulting data object
     * @memberof Wrapper
     */
    loadFromObject(obj: T, replace = true) {
        this.loadedFields = [...this.allFields];
        for (const key of this.allFields) {
            if (this.loadedFields.includes(key) && !replace)
                continue;
            this.data[key] = obj[key];
        }
        return this.data;
    }

    /**
     * Reloads all already loaded fields of the wrapper
     *
     * @param {Keys<T>} [fields] If set it only reloads those fields (can also be not yet loaded fields)
     * @returns
     * @memberof Wrapper
     */
    async resync(fields?: Keys<T>) {
        let result = await this.load(fields || this.loadedFields, true);
        return result ? this : undefined;
    }

    /**
     * Creates a getter for a specific field that connects with 
     *
     * @private
     * @param {string} key Field to define a getter for
     * @memberof Wrapper
     */
    private setProperty(key: keyof T) {
        this.setCustomProperty(key, () => {
            if (!this.isLoaded(key)) {
                console.warn(new Error(`The wrapper property "${key}" has been accessed before being loaded. Please first check if a property is already loaded with "Wrapper.load()".`));
                return undefined;
            }
            return this.data[key];
        });
    }

    /**
     * Sets the provided getter and creates a Setter that throws an error
     *
     * @protected
     * @param {ObjectKey} key What key should be used
     * @param {() => any} getter Getter to set
     * @memberof Wrapper
     */
    protected setCustomProperty(key: ObjectKey, getter: () => any) {
        Object.defineProperty(this, key, {
            get: getter,
            set: () => {
                throw new Error(`Attempted to set property "${String(key)}". Wrapper properties cannot be changed directly. Use provided functions for that.`);
            },
            configurable: true
        });
    }

    /**
     * Makes a updateOne call to update the document in the database
     *
     * @private
     * @param {*} doc What should be updated
     * @returns Query as a promise
     * @memberof GuildWrapper
     */
    protected update(doc: any) {
        return this.model.updateOne(this.uniqueQuery, doc).exec();
    }

    /**
     * If the entire document or a specific field is loaded
     *
     * @param {string} [field] What field to check. If not specified the entire document will be checked
     * @returns If the specified part is loaded
     * @memberof Wrapper
     */
    isLoaded(field?: keyof T) {
        if (!this.loadedFields) return true;
        if (!field) return false;
        return this.loadedFields.includes(field);
    }

    /**
     * Updates which fields of the wrapper are loaded
     *
     * @private
     * @param {Keys<T>} [fields] Fields that were newly loaded
     * @returns Which fields weren't loaded before
     * @memberof Wrapper
     */
    protected updateLoadedFields(fields?: Keys<T>) {
        if (!this.loadedFields)
            return [];
        if (!fields)
            fields = this.allFields;
        let newFields = _.difference(fields, this.loadedFields);
        this.loadedFields = this.loadedFields.concat(newFields);
        if (!_.difference(this.loadedFields, this.allFields).length) this.loadedFields = undefined;
        return newFields;
    }

    /**
     * Loads specified not loaded fields. 
     * If force is true it loads all specified fields regardless of if they are already loaded.
     *
     * @param {OptionalFields<T>} [fields] Fields to load (Can also be a single field)
     * @param {boolean} [force=false] If already loaded fields should also be reloaded
     * @returns Which fields were newly loaded
     * @memberof Wrapper
     */
    async load(fields?: OptionalFields<T>, force = false) {
        fields = fields ? [].concat(fields) : undefined;
        let loadFields = this.updateLoadedFields(fields);
        if (!loadFields.length && !force) return [];
        if (force) loadFields = fields;

        let doc = await this.getDoc(loadFields);
        if (!doc) return undefined;

        for (const key of loadFields || this.allFields)
            this.data[key] = doc[key];
        return loadFields;
    }

    /**
     * Removes the corresponding document from the database
     *
     * @returns
     * @memberof Wrapper
     */
    remove() {
        this.removed = true;
        return this.model.deleteOne(this.uniqueQuery).exec();
    }

}