import _, { PropertyPath } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { Keys, ObjectKey } from '../schemas/global';

/**
 * Generator for getters of a object
 */
export type GetterGenerator<Data extends object> = (key: keyof Data) => () => any;

/**
 * Universal wrapper for an object to cache
 *
 * @export
 * @abstract
 * @class DataWrapper
 * @template Data
 * @template CachedData
 */
export abstract class DataWrapper<Data extends object, CachedData extends object>{

    /**
     * Cached data
     *
     * @type {BehaviorSubject<CachedData>}
     * @memberof DataWrapper
     */
    readonly data: BehaviorSubject<CachedData>;
    /**
     * All root keys the wrapped object has
     *
     * @type {Keys<Data>}
     * @memberof DataWrapper
     */
    readonly allFields: Keys<Data>;

    /**
     * Creates an instance of DataWrapper.
     * 
     * @param {CachedData} initialData Data that will be used to init the cache
     * @param {Keys<Data>} allFields All root keys the wrapped object has
     * @memberof DataWrapper
     */
    constructor(initialData: CachedData, allFields: Keys<Data>) {
        this.data = new BehaviorSubject(initialData);
        this.allFields = allFields;
    }

    /**
     * Maps data to path and only triggers if value at that path changes
     *
     * @param {PropertyPath} path Path to map to and watch
     * @returns Observable of value at specified path
     * @memberof DataWrapper
     */
    subToMappedProperty(path: PropertyPath) {
        return this.data.pipe(
            map(data => _.get(data, path)),
            distinctUntilChanged(_.isEqual)
        );
    }

    /**
     * Only triggers when value at the specified path changes
     *
     * @param {PropertyPath} path Path to watch
     * @returns Observable of entire data
     * @memberof DataWrapper
     */
    subToPropertyChange(path: PropertyPath) {
        return this.data.pipe(
            distinctUntilChanged((prev, curr) => {
                let prevProp = _.get(prev, path);
                let currProp = _.get(curr, path);
                return _.isEqual(prevProp, currProp);
            })
        );
    }

    /**
     * Sets all virtual getter for the object keys using dataGetterGenerator()
     *
     * @protected
     * @param {Keys<Data>} [ignoreKeys=[]] Which keys shouldn't be set
     * @memberof DataWrapper
     */
    protected setDataGetters(ignoreKeys: Keys<Data> = []) {
        this.setCustomDataGetters(this.dataGetterGenerator, _.difference(this.allFields, ignoreKeys));
    }

    /**
     * GetterGenerator used by setDataGetters()
     *
     * @protected
     * @abstract
     * @param {keyof Data} key Key to generate getter for
     * @returns {() => any} Getter
     * @memberof DataWrapper
     */
    protected abstract dataGetterGenerator(key: keyof Data): () => any;

    /**
     * Sets a custom getter for specified fields
     *
     * @protected
     * @param {GetterGenerator<Data>} getterGenerator
     * @param {*} [keys=this.allFields] (Default all root keys of wrapped object) Fields to set custom getter for
     * @memberof DataWrapper
     */
    protected setCustomDataGetters(getterGenerator: GetterGenerator<Data>, keys = this.allFields) {
        keys.forEach(key => this.setWrapperProperty(key, getterGenerator(key)));
    }

    /**
     * Sets the specified getter and additionally a setter which throws an error
     *
     * @protected
     * @param {ObjectKey} key Key to set getter for
     * @param {*} [getter=() => this.data.value[key]] Getter
     * @memberof DataWrapper
     */
    protected setWrapperProperty(key: ObjectKey, getter = () => this.data.value[key]) {
        Object.defineProperty(this, key, {
            get: getter,
            set: () => {
                throw new Error(`Attempted to set property "${String(key)}". Wrapper properties cannot be changed directly. Use provided functions for that.`);
            },
            configurable: true
        });
    }

    /**
     * Clones the data so it can be manipulated
     *
     * @returns
     * @memberof DataWrapper
     */
    cloneData() {
        return _.cloneDeep(this.data.value);
    }

}