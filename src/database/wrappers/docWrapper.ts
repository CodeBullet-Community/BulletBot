import _ from 'lodash';
import { Model } from 'mongoose';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { ExDocument, Keys, ObjectKey, OptionalFields } from '../schemas/global';
import { WrapperSynchronizer } from './wrapperSynchronizer';

/**
 * Options defining what and how fields should be loaded in a wrapper
 */
export type LoadOptions<T extends Object> = {
    /**
     * What fields should be loaded
     *
     * @type {OptionalFields<T>}
     */
    fields?: OptionalFields<T>;
    /**
     * If already loaded fields should also be reloaded
     *
     * @type {boolean}
     */
    reload?: boolean;
} | OptionalFields<T>;

/**
 * Wrapper for mongoDB documents. 
 * This class handles what part of the document is already loaded and 
 * general interfacing with the document on the database 
 *
 * @export
 * @class DocWrapper
 * @template T Object which it wraps
 */
export class DocWrapper<T extends Object> {

    /**
     * Model for document this wrapper holds
     *
     * @type {Model<ExDocument<T>>}
     * @memberof DocWrapper
     */
    readonly model: Model<ExDocument<T>>;
    /**
     * Unique query that identifies the document
     *
     * @type {*}
     * @memberof DocWrapper
     */
    readonly uniqueQuery: any;
    /**
     * Fields that are currently loaded
     *
     * @type {Keys<T>}
     * @memberof DocWrapper
     */
    loadedFields: Keys<T>;
    /**
     * All fields that the document has (all keys of base document)
     *
     * @type {Keys<T>}
     * @memberof DocWrapper
     */
    readonly allFields: Keys<T>;
    /**
     * Cached data
     *
     * @type {BehaviorSubject<Partial<T>>}
     * @memberof DocWrapper
     */
    readonly data: BehaviorSubject<Partial<T>>;
    /**
     * Synchronizer for active synchronization with database
     *
     * @private
     * @type {WrapperSynchronizer<T>}
     * @memberof DocWrapper
     */
    private synchronizer?: WrapperSynchronizer<T>;
    /**
     * If document was deleted from database 
     * (Only tracks deletions after creation of wrapper and assumes that document exists when first created)
     *
     * @type {boolean}
     * @memberof DocWrapper
     */
    removed: boolean;

    /**
     * Creates an instance of DocWrapper.
     * 
     * @param {Model<T>} model Model of collection where the document is stored in
     * @param {*} uniqueQuery Query conditions for finding the document corresponding to the wrapper 
     * @param {Keys<T>} preloadedFields Fields that are already set by the extenders constructor
     * @param {Keys<T>} allFields Array of all the fields that the object can have (Use keys<T>() from 'ts-transformer-keys' to get them)
     * @memberof DocWrapper
     */
    constructor(model: Model<ExDocument<T>>, uniqueQuery: any, preloadedFields: Keys<T>, allFields: Keys<T>) {
        this.model = model;
        this.uniqueQuery = uniqueQuery;
        this.loadedFields = preloadedFields;
        this.allFields = allFields;
        this.data = new BehaviorSubject({});
        this.allFields.forEach(key => this.setProperty(key));
        this.removed = false;
    }

    /**
     * Queries the database for the document corresponding to the wrapper
     *
     * @private
     * @param {Keys<T>} [fields] What parts of the document should be returned
     * @returns The document if it was found
     * @memberof DocWrapper
     */
    protected getDoc(fields?: Keys<T>) {
        return this.model.findOne(this.uniqueQuery, fields ? fields.join(' ') : undefined).exec();
    }

    /**
     * Checks if the document corresponding to this wrapper exists
     *
     * @returns
     * @memberof DocWrapper
     */
    async docExists() {
        return await this.getDoc([]) ? true : false;
    }

    /**
     * Creates a document for this wrapper with the provided content. 
     * It first checks if there is already a document and if so (by default) doesn't create one. 
     * If overwrite is true and a document already exists it first deletes the old one.
     * 
     * IMPORTANT: The wrapper doesn't check if the document is correct or can actually be found by its uniqueQuery.
     *
     * @param {T} content The content of the document
     * @param {boolean} [overwrite=false] If it should overwrite the old document (Default false)
     * @returns The created document if it was created
     * @memberof DocWrapper
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
     * Pipes the data through distinctUntilChanged so it subscribers only get called if a certain field has changed
     *
     * @param {keyof T} field Field to watch for changes on
     * @returns Piped Observable 
     * @memberof DocWrapper
     */
    subToField(field: keyof T) {
        return this.data.pipe(
            distinctUntilChanged((prev, curr) => _.isEqual(prev[field], curr[field]))
        );
    }

    /**
     * Clones the data object so it can be manipulated
     *
     * @returns
     * @memberof DocWrapper
     */
    cloneData() {
        return _.cloneDeep(this.data.value);
    }

    /**
     * Loads fields from a provided object. 
     * The object is seen as fully loaded, so undefined fields will also be used.
     *
     * @param {T} obj The object to load from
     * @param {boolean} [overwrite=true] If already loaded fields should be replaced
     * @returns The resulting data object
     * @memberof DocWrapper
     */
    loadFromObject(obj: T) {
        this.data.next(obj);
        this.loadedFields = undefined;
        return this;
    }

    /**
     * Merges loaded data with the already loaded data
     *
     * @private
     * @param {T} obj Data to merge
     * @param {Keys<T>} fieldsToMerge Fields that should be merged
     * @param {boolean} [overwrite=false] If already loaded fields should be overwritten
     * @returns
     * @memberof DocWrapper
     */
    private mergeData(obj: T, fieldsToMerge: Keys<T>, overwrite = false) {
        let tempData = this.cloneData();
        for (const key of fieldsToMerge) {
            if (!overwrite && this.loadedFields.includes(key))
                continue;
            tempData[key] = obj[key];
        }
        this.data.next(tempData);
        return tempData;
    }

    /**
     * Reloads all already loaded fields of the wrapper
     *
     * @param {Keys<T>} [fields] If set it only reloads those fields (can also be not yet loaded fields)
     * @returns
     * @memberof DocWrapper
     */
    async resync(fields?: Keys<T>) {
        let result = await this.load({ fields: fields || this.loadedFields, reload: true });
        return result ? this : undefined;
    }

    /**
     * Enables active synchronization. 
     * If synchronizer for specified fields already exist it will only return the synchronizer.
     * Not providing already synced fields will result in them no longer being synchronized.
     *
     * @param {Keys<T>} [fields] What fields should be synchronized 
     * @returns Synchronizer 
     * @memberof DocWrapper
     */
    enableSync(fields?: Keys<T>) {
        if (!_.isEqual(_.sortBy(this.synchronizer?.syncedFields), _.sortBy(fields)))
            this.synchronizer = new WrapperSynchronizer(this, fields);
        return this.synchronizer;
    }

    /**
     * Disables active synchronization if not already disabled
     *
     * @returns
     * @memberof DocWrapper
     */
    async disableSync() {
        if (!this.synchronizer) return;
        this.synchronizer.close();
        delete this.synchronizer;
    }

    /**
     * Creates a getter for a specific field that connects with 
     *
     * @private
     * @param {string} key Field to define a getter for
     * @memberof DocWrapper
     */
    private setProperty(key: keyof T) {
        this.setCustomProperty(key, () => {
            if (!this.isLoaded(key)) {
                console.warn(new Error(`The wrapper property "${key}" has been accessed before being loaded. Please first check if a property is already loaded with "Wrapper.load()".`));
                return undefined;
            }
            return this.data.value;
        });
    }

    /**
     * Sets the provided getter and creates a Setter that throws an error
     *
     * @protected
     * @param {ObjectKey} key What key should be used
     * @param {() => any} getter Getter to set
     * @memberof DocWrapper
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
     * @memberof DocWrapper
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
     * @memberof DocWrapper
     */
    updateLoadedFields(fields?: Keys<T>) {
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
     * Extracts fields that should be loaded from LoadOptions
     *
     * @private
     * @param {LoadOptions<T>} options Options to extract fields from
     * @returns {Keys<T>} Fields that should be loaded
     * @memberof DocWrapper
     */
    private extractFieldsToLoad(options: LoadOptions<T>): Keys<T> {
        if (!options) return;
        if (Array.isArray(options)) return options;
        if (typeof options !== 'object') return [options];
        if (options.fields) return [].concat(options.fields);
        return undefined;
    }

    /**
     * Extracts if fields should be reloaded from LoadOptions
     *
     * @private
     * @param {LoadOptions<T>} options Options to extract it from
     * @returns If fields should be reloaded
     * @memberof DocWrapper
     */
    private extractIfReload(options: LoadOptions<T>) {
        if (!options) return false;
        // @ts-ignore
        if (options.reload) return true;
        return false;
    }

    /**
     * Loads specified not loaded fields. 
     * If force is true it loads all specified fields regardless of if they are already loaded.
     *
     * @param {LoadOptions<T>} [options] Options for loading (default loads all fields)
     * @returns Loaded data
     * @memberof DocWrapper
     */
    async load(options?: LoadOptions<T>) {
        let fields = this.extractFieldsToLoad(options);
        let reload = this.extractIfReload(options);
        let loadFields = this.updateLoadedFields(fields);
        if (!loadFields.length && !reload) return [];
        if (reload) loadFields = fields;

        let doc = await this.getDoc(loadFields);
        if (!doc) return undefined;

        return this.mergeData(doc, loadFields || this.allFields, true);
    }

    /**
     * Removes the corresponding document from the database
     *
     * @returns
     * @memberof DocWrapper
     */
    remove() {
        this.removed = true;
        return this.model.deleteOne(this.uniqueQuery).exec();
    }

}