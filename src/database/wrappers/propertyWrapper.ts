import _, { PropertyPath } from 'lodash';

import { Keys } from '../schemas/global';
import { DataWrapper } from './dataWrapper';
import { DocWrapper } from './docWrapper';

/**
 * Wrapper for a property of a DocWrapper
 *
 * @export
 * @class PropertyWrapper
 * @extends {DataWrapper<Property, Property>}
 * @template Parent DocWrapper which hold this PropertyWrapper
 * @template Property Property which this PropertyWrapper wraps
 */
export class PropertyWrapper<Parent extends DocWrapper<any>, Property extends object> extends DataWrapper<Property, Property>{

    /**
     * DocWrapper which hold this PropertyWrapper
     *
     * @type {Parent}
     * @memberof PropertyWrapper
     */
    readonly parent: Parent;
    /**
     * Path in parent to wrapped property
     *
     * @type {PropertyPath}
     * @memberof PropertyWrapper
     */
    readonly path: PropertyPath;
    /**
     * Field which this property is in
     *
     * @type {keyof Parent['data']['value']}
     * @memberof PropertyWrapper
     */
    readonly field: keyof Parent['data']['value'];

    /**
     * Creates an instance of PropertyWrapper.
     * 
     * @param {Parent} parent DocWrapper which hold this PropertyWrapper
     * @param {PropertyPath} path Path in parent to wrapped property
     * @param {Keys<Property>} allFields All root keys of the property
     * @memberof PropertyWrapper
     */
    constructor(parent: Parent, path: PropertyPath, allFields: Keys<Property>) {
        super(undefined, allFields);
        this.parent = parent;
        let pathArray = _.toPath(path);
        this.field = pathArray[0];
        this.parent.subToMappedProperty(pathArray).subscribe(this.data);
    }

    /**
     * Getter generator without any checks
     *
     * @protected
     * @param {keyof Property} key
     * @returns
     * @memberof PropertyWrapper
     */
    protected dataGetterGenerator(key: keyof Property) {
        return () => this.data.value[key];
    }

    /**
     * Resyncs field in which this PropertyWrapper is
     *
     * @memberof PropertyWrapper
     */
    resync() {
        this.load(true);
    }

    /**
     * Loads field in which this PropertyWrapper is
     *
     * @param {boolean} [reload=false] If it should not check if it's already loaded
     * @returns Fields which have been loaded in parent
     * @memberof PropertyWrapper
     */
    load(reload = false) {
        return this.parent.load({ fields: this.field, reload });
    }

    /**
     * If field in which this PropertyWrapper is is loaded
     *
     * @returns
     * @memberof PropertyWrapper
     */
    isLoaded() {
        return this.parent.isLoaded(this.field);
    }

}