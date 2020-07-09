import { Collection } from 'discord.js';
import path from 'path';
import { container } from 'tsyringe';

import { Command } from './command';
import { CommandModule } from './commandModule';

export interface CommandCategoryConfig {
    path: string;
    name: string;
    description: string;
    hidden?: boolean;
    commands: string[];
    subcategories?: CommandCategoryConfig[];
}

export class CommandCategory {

    readonly name: string;
    readonly description: string;
    readonly hidden: boolean;
    readonly commands: Collection<string, Command>;
    readonly subcategories?: Collection<string, CommandCategory>;

    private readonly commandModule: CommandModule;

    constructor(basePath: string, config: CommandCategoryConfig) {
        this.commandModule = container.resolve<CommandModule>(CommandModule);

        this.name = config.name;
        this.description = config.description;
        this.hidden = config.hidden || false;
        let categoryPath = path.join(basePath, config.path);

        this.commands = new Collection();
        for (const name of config.commands) {
            let command = this.commandModule.loadCommand(path.join(categoryPath, name));
            this.commands.set(name, command);
        }

        this.subcategories = new Collection();
        for (const categoryConfig of config.subcategories) {
            let lowercaseName = categoryConfig.name.toLowerCase();
            let category = new CommandCategory(categoryPath, categoryConfig);
            this.subcategories.set(lowercaseName, category);
        }
    }

    resolvePath(path: string) {
        let [nextName, remainder] = path.split(/[/\\]/, 2);
        let next = this.subcategories?.get(nextName);
        if (remainder == null || remainder == '')
            return next;
        if (next == null)
            throw new Error("Command path is invalid.");
        next.resolvePath(path);
    }


}