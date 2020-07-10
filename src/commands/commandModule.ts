import { Client, Collection } from 'discord.js';
import { singleton } from 'tsyringe';

import { Command } from './command';
import { CommandCategory } from './commandCategory';
import commandConfig from './commands.json';

/**
 * Manages all commands and attaches itself to client to listen to command execution requests
 *
 * @export
 * @class CommandModule
 */
@singleton()
export class CommandModule {

    /**
     * Commands mapped to their name and all aliases
     *
     * @type {Collection<string, Command>}
     * @memberof CommandModule
     */
    readonly commands: Collection<string, Command>;
    /**
     * Structure of command tree
     *
     * @type {CommandCategory}
     * @memberof CommandModule
     */
    readonly structure: CommandCategory;

    private readonly client: Client;

    /**
     * Creates an instance of CommandModule.
     * 
     * @param {Client} client
     * @memberof CommandModule
     */
    constructor(client: Client) {
        this.commands = new Collection();
        this.structure = new CommandCategory('', commandConfig);
        this.client = client;
    }

    /**
     * Loads a command into the module and returns the command
     *
     * @param {string} filePath
     * @returns
     * @memberof CommandModule
     */
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