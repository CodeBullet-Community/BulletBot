import { Client, Collection } from 'discord.js';
import { singleton } from 'tsyringe';

import { Command } from './command';
import { CommandCategory } from './commandCategory';
import commandConfig from './commands.json';

@singleton()
export class CommandModule {

    readonly commands: Collection<string, Command>;
    readonly structure: CommandCategory;

    private readonly client: Client;

    constructor(client: Client) {
        this.commands = new Collection();
        this.structure = new CommandCategory('', commandConfig);
        this.client = client;
    }

    loadCommand(filePath: string) {
        let module = require(filePath);
        if (module.default == null)
            throw new Error(`Command at ${filePath} failed to import. Command class needs to be the default export.`);

        let command: Command = module.default();
        if (!(command instanceof Command))
            throw new Error(`Command at ${filePath} failed to import. Default export is not a command.`);

        this.commands.set(command.name, command);
        for (const alias of command.aliases)
            this.commands.set(alias, command);

        return command;
    }

    
}