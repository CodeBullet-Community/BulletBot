import _ from 'lodash';
import { ChangeStream } from 'mongodb';

import { DocWrapper } from './docWrapper';

/**
 * Enables real-time synchronization between wrapper and database
 *
 * @export
 * @class WrapperSynchronizer
 * @template T Object it will be synchronize
 */
export class WrapperSynchronizer<T extends Object> {

    /**
     * Which fields are being synchronized by this synchronizer
     *
     * @type {Keys<T>}
     * @memberof WrapperSynchronizer
     */
    readonly syncedFields: Keys<T>;
    /**
     * Which wrapper this synchronizer is for
     *
     * @type {DocWrapper<T>}
     * @memberof WrapperSynchronizer
     */
    readonly wrapper: DocWrapper<T>;
    /**
     * Pipeline that is used to the ChangeStream
     *
     * @private
     * @type {object[]}
     * @memberof WrapperSynchronizer
     */
    private readonly pipeline: object[];
    /**
     * ChangeStream of this synchronizer
     *
     * @private
     * @type {ChangeStream}
     * @memberof WrapperSynchronizer
     */
    private changeStream: ChangeStream;
    /**
     * If synchronizer is currently active
     *
     * @readonly
     * @memberof WrapperSynchronizer
     */
    get active() {
        return !this.changeStream.isClosed();
    }

    /**
     * Creates an instance of WrapperSynchronizer and start synchronization
     * 
     * @param {DocWrapper<T>} wrapper
     * @param {Keys<T>} [fields]
     * @memberof WrapperSynchronizer
     */
    constructor(wrapper: DocWrapper<T>, fields?: Keys<T>) {
        this.wrapper = wrapper;
        this.syncedFields = fields;
        this.pipeline = [
            { $match: this.generateUniqueQuery() },
            this.generateProjectStage(fields)
        ];
        this.changeStream = this.wrapper.model.watch(this.pipeline);
        this.changeStream.on('change', this.onChange);
    }

    /**
     * Creates a unique query for the ChangeStream
     *
     * @private
     * @returns
     * @memberof WrapperSynchronizer
     */
    private generateUniqueQuery() {
        let query = _.cloneDeep(this.wrapper.uniqueQuery);
        for (const key in query) {
            query[`fullDocument.${key}`] = query[key];
            delete query[key];
        }
        return query;
    }

    /**
     * Generates the project stage for the ChangeStream
     *
     * @private
     * @param {Keys<T>} [fields] The only fields it should include
     * @returns
     * @memberof WrapperSynchronizer
     */
    private generateProjectStage(fields?: Keys<T>) {
        if (!fields) return undefined;
        let project = {};
        let excludeFields = _.difference(this.wrapper.allFields, fields);
        for (const key in excludeFields)
            project[`fullDocument.${key}`] = false;
        return project;
    }

    /**
     * If a fields is being synchronized
     *
     * @param {keyof T} fields
     * @returns
     * @memberof WrapperSynchronizer
     */
    isSynced(fields: keyof T) {
        if (this.syncedFields === undefined) return true;
        if (this.syncedFields.includes(fields)) return true;
        return false;
    }

    /**
     * Listens to ChangeStream and distributes events to appropriate functions
     *
     * @private
     * @param {*} event
     * @memberof WrapperSynchronizer
     */
    private onChange(event: any) {
        switch (event.operationType) {
            case 'drop':
            case 'rename':
            case 'dropDatabase':
            case 'delete':
                this.onDeleteEvent(event);
                break;
            case 'insert':
            case 'replace':
                this.onEventWithFullDocument(event);
                break;
            case 'update':
                this.onEventWithDelta(event);
                break;
            case 'invalidate':
                this.close();
            default:
                break;
        }
    }

    /**
     * When the document was deleted
     *
     * @private
     * @param {*} event
     * @memberof WrapperSynchronizer
     */
    private onDeleteEvent(event: any) {
        this.wrapper.removed = true;
    }

    /**
     * When the change event contains the "fullDocument" property
     *
     * @private
     * @param {*} event
     * @memberof WrapperSynchronizer
     */
    private onEventWithFullDocument(event: any) {
        this.wrapper.removed = false;
        this.wrapper.loadFromObject(event.fullDocument);
    }

    /**
     * When event contains description of what changed in the document
     *
     * @private
     * @param {*} event
     * @memberof WrapperSynchronizer
     */
    private onEventWithDelta(event: any) {
        let data = _.cloneDeep(this.wrapper.data.value);
        let changedFields = []
        for (let [path, value] of Object.entries(event.updateDescription.updatedFields)) {
            let pathArray = _.toPath(path);
            // @ts-ignore
            if (!this.isSynced(pathArray[0])) continue;
            changedFields.push(pathArray[0]);
            _.set(data, pathArray, value);
        }
        for (const path of event.updateDescription.removedFields) {
            let pathArray = _.toPath(path);
            // @ts-ignore
            if (!this.isSynced(pathArray[0])) continue;
            changedFields.push(pathArray[0]);
            _.unset(data, pathArray);
        }
        this.wrapper.data.next(data);
    }


    /**
     * Closes ChangeStream and disables synchronizer
     *
     * @memberof WrapperSynchronizer
     */
    close() {
        this.changeStream.close();
    }
}