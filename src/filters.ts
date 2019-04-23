import { Collection, Message, Guild } from "discord.js";
import * as fs from "fs";
import { Bot } from ".";
import { filterAction, executeActions } from "./utils/filters";

import { sendError } from "./utils/messages";
import { filtersObject } from "./database/schemas";

/**
 * what every filter will output if he finds something
 *
 * @export
 * @interface filterOutput
 */
export interface filterOutput {
    reason: string;
    actions: filterAction[];
}

/**
 * definition of a filter with all properties and functions
 *
 * @export
 * @interface filterInterface
 */
export interface filterInterface {
    /**
     * name of filter
     *
     * @type {string}
     * @memberof filterInterface
     */
    name: string,
    /**
     * optional property that should be set as empty string. It can change the actual position in the structure. The categories are separated by /
     *
     * @type {string}
     * @memberof filterInterface
     */
    path: string,
    /**
     * a very short desc of what the filter does
     *
     * @type {string}
     * @memberof filterInterface
     */
    shortHelp: string,
    /**
     * a embed and long description of what the filter does exactly
     *
     * @memberof filterInterface
     */
    embedHelp: (guild: Guild) => any,
    /**
     * function that gets called to run a filter adn which returns the filter output
     *
     * @memberof filterInterface
     */
    run: (message: Message) => Promise<filterOutput>,
};

/**
 * loads all filters in /filters and structures them
 *
 * @export
 * @class Filters
 */
export class Filters {
    /**
     * collection of all filters with their name as key
     *
     * @type {Collection<string, filterInterface>}
     * @memberof Filters
     */
    filters: Collection<string, filterInterface>;
    /**
     * filters structured as they are in the folders and as specified in the path property
     *
     * @type {Object}
     * @memberof Filters
     */
    structure: Object;
    constructor(dir: string) {
        this.filters = new Collection();
        this.structure = {};
        this.loadFilters(dir, this.structure);
    }

    /**
     * loads filters in a folder and calls it self for every folder it encounters
     *
     * @param {string} dir folder where to load filters from
     * @param {Object} structureObject structure tree where this folder is
     * @memberof Filters
     */
    loadFilters(dir: string, structureObject: Object) {
        fs.readdir(dir, (err, files) => {
            if (err) console.error(err);

            var folders = files.filter(f => fs.lstatSync(dir + f).isDirectory()); //  filters out of non folders and calls it self for every remaining object
            folders.forEach((f, i) => {
                structureObject[f] = {}
                this.loadFilters(dir + f + "/", structureObject[f]);
            });

            var filters = files.filter(f => f.split(".").pop() == "js"); // filters out every non js file and loads the remaining into the structure and collection
            if (filters.length <= 0) {
                console.error("no filters to load in " + dir);
                return;
            }
            console.info(`loading ${filters.length} filters in ${dir}`);
            filters.forEach((f, i) => {
                var props = require(dir + f).default;
                console.info(`${i + 1}: ${f} loaded!`);
                this.filters.set(props.name, props);
                // puts filter in structure
                var strucObject = structureObject;
                if (props.path != "") { // if custom path is defined
                    var keys = props.path.split("/");
                    strucObject = this.structure;
                    for (var i = 0; i < keys.length; i++) {
                        if (!strucObject[keys[i]]) {
                            strucObject[keys[i]] = {};
                        }
                        strucObject = strucObject[keys[i]];
                    }
                }
                strucObject[props.name] = props;
            });
        });
    }

    /**
     * runs message through filter and stops if one catches something
     *
     * @param {Message} message message to filter
     * @returns
     * @memberof Filters
     */
    async filterMessage(message: Message) {
        try {
            var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);// loads filter doc to see which filters are active
            if (!filtersDoc) return;
            var filterObject: filtersObject = filtersDoc.toObject();
            for (const filter of this.filters.array()) {
                if (!filterObject.filters[filter.name] || !filterObject.filters[filter.name]._enabled) continue;
                var output = await filter.run(message); // runs filter
                if (output) { // if filter output isn't undefined, which means it found something
                    Bot.mStats.logFilterCatch(filter.name);
                    Bot.logger.logFilterCatch(message, filter, output.reason, output.actions);
                    executeActions(message, output.actions);
                    return;
                }
            }
        } catch (e) {
            sendError(message.channel, { error: "Error occurred at filterMessage", e });
            Bot.mStats.logError();
        }
    }

    /**
     * getter for filter with name
     *
     * @param {string} filter name of filter
     * @returns
     * @memberof Filters
     */
    get(filter: string) {
        return this.filters.get(filter);
    }
}