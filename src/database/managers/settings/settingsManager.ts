import { CacheManager } from "../cacheManager";
import { GuildObject } from "../../schemas/main/guild";
import { MongoCluster } from "../../mongoCluster";
import { singleton } from "tsyringe";
import { globalSettingsSchema, GlobalSettingsObject } from "../../schemas/settings/settings";
import { SettingsWrapper } from "../../wrappers/settings/settingsWrapper";
import { LoadOptions } from "../../wrappers/docWrapper";
import { FetchOptions } from "../collectionManager";

/**
 * Holds the settings model
 *
 * @export
 * @class SettingsManager
 * @extends {CacheManager<GlobalSettingsObject, typeof SettingsWrapper, SettingsManager>}
 */
@singleton()
export class SettingsManager extends CacheManager<GlobalSettingsObject, typeof SettingsWrapper, SettingsManager> {

    /**
     * Creates an instance of SettingsManager.
     * 
     * @param {MongoCluster} cluster
     * @memberof SettingsManager
     */
    constructor(cluster: MongoCluster) {
        super(cluster, 'settings', 'settings', globalSettingsSchema, SettingsWrapper);
    }

    /**
     * Returns a minimal config with an empty bot masters array
     *
     * @returns
     * @memberof SettingsManager
     */
    getDefaultObject() {
        return {
            botMasters: []
        };
    }

    /**
     * Always returns '0'
     *
     * @returns
     * @memberof SettingsManager
     */
    getCacheKey() {
        return '0';
    }

    /**
     * Gets the cached settings wrapper
     *
     * @param {LoadOptions<GlobalSettingsObject>} [options]
     * @returns
     * @memberof SettingsManager
     */
    get(options?: LoadOptions<GlobalSettingsObject>) {
        return this.getCached(options);
    }

    /**
     * Fetches the settings wrapper
     *
     * @param {FetchOptions<GlobalSettingsObject>} [options]
     * @returns
     * @memberof SettingsManager
     */
    async fetch(options?: FetchOptions<GlobalSettingsObject>) {
        return this._fetch([], [], [], options);
    }
}