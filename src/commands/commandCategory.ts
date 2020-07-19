import { Collection } from 'discord.js';
import path from 'path';
import { container } from 'tsyringe';

import { Command } from './command';
import { CommandHolder } from './commandHolder';
import { CommandModule } from './commandModule';

/**
 * Json config for command module
 *
 * @export
 * @interface CommandCategoryConfig
 */
export interface CommandCategoryConfig {
    path: string;
    name: string;
    description: string;
    hidden?: boolean;
    commands: string[];
    subcategories?: CommandCategoryConfig[];
}

/**
 * Command category that holds commands and can hold subcategories
 *
 * @export
 * @class CommandCategory
 */
export class CommandCategory extends CommandHolder {

    /**
     * Name of category
     *
     * @type {string}
     * @memberof CommandCategory
     */
    readonly name: string;
    /**
     * Description of category
     *
     * @type {string}
     * @memberof CommandCategory
     */
    readonly description: string;
    /**
     * If the category is hidden
     *
     * @type {boolean}
     * @memberof CommandCategory
     */
    readonly hidden: boolean;
    /**
     * Commands that are in this category
     *
     * @type {Collection<string, Command>}
     * @memberof CommandCategory
     */
    readonly commands: Collection<string, Command>;
    /**
     * Categories that are in this category
     *
     * @type {Collection<string, CommandCategory>}
     * @memberof CommandCategory
     */
    readonly subcategories?: Collection<string, CommandCategory>;

    private readonly commandModule: CommandModule;

    /**
     * Creates an instance of CommandCategory.
     * 
     * @param {CommandModule} commandModule The command module is not resolved via dependency injection to prevent circular dependencies
     * @param {string} basePath Path to the parent directory of the category
     * @param {CommandCategoryConfig} config Command category configuration
     * @memberof CommandCategory
     */
    constructor(commandModule: CommandModule, basePath: string, config: CommandCategoryConfig) {
        super();
        this.commandModule = commandModule;

        this.name = config.name;
        this.description = config.description;
        this.hidden = config.hidden || false;
        let categoryPath = path.join(basePath, config.path);

        for (const name of config.commands) {
            let command = this.commandModule.loadCommand(path.join(categoryPath, name));
            this.commands.set(name, command);
        }

        this.subcategories = new Collection();
        for (const categoryConfig of Object.values(config.subcategories ?? {})) {
            let lowercaseName = categoryConfig.name.toLowerCase();
            let category = new CommandCategory(commandModule, categoryPath, categoryConfig);
            this.subcategories.set(lowercaseName, category);
        }
    }

    /**
     * Resolves a path and returns the category if there is one. 
     * If there is no category at specified path it will return undefined.
     *
     * @param {string} path Path to resolve
     * @returns
     * @memberof CommandCategory
     */
    resolvePath(path: string) {
        let [nextName, remainder] = path.split(/[/\\]/, 2);
        let next = this.subcategories?.get(nextName);
        if (remainder == null || remainder == '' || next == null)
            return next;
        next.resolvePath(path);
    }


}