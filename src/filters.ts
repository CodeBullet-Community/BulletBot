import { Collection, Message, Guild } from "discord.js";
import * as fs from "fs";
import { Bot } from ".";
import { filterAction, executeActions } from "./utils/filters";

import { sendError } from "./utils/messages";

export interface filterOutput {
    report: any;
    actions: filterAction[];
}

export interface filter {
    name: string,
    path: string,
    active: (guild: Guild) => Promise<boolean>,
    shortHelp: string,
    embedHelp: (guild: Guild) => any,
    run: (message: Message) => Promise<filterOutput>,
    cache: any,
};

export class Filters {
    filters: Collection<string, filter>;
    structure: Object;
    constructor(dir: string) {
        this.filters = new Collection();
        this.structure = {};
        this.loadFilters(dir, this.structure);
    }

    loadFilters(dir: string, structureObject: Object) {
        fs.readdir(dir, (err, files) => {
            if (err) console.error(err);

            var folders = files.filter(f => fs.lstatSync(dir + f).isDirectory());
            folders.forEach((f, i) => {
                structureObject[f] = {}
                this.loadFilters(dir + f + "/", structureObject[f]);
            });

            var filters = files.filter(f => f.split(".").pop() == "js");
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
                if (props.path != "") {
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

    async filterMessage(message: Message) {
        try {
            var filterArray = this.filters.array();
            for (var i = 0; i < filterArray.length; i++) {
                if (!(await filterArray[i].active(message.guild))) continue;
                var output = await filterArray[i].run(message);
                if (output) {
                    Bot.mStats.logFilterCatch(filterArray[i].name);
                    // TODO logger log
                    executeActions(message, output.actions);
                    return;
                }
            }
        } catch (e) {
            sendError(message.channel, { error: "Error occurred at filterMessage", e });
            Bot.mStats.logError();
        }
    }

    get(filter: string) {
        return this.filters.get(filter);
    }
}