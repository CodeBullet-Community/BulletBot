import { Collection } from 'discord.js';

import { Command, CommandName, CommandResolvable } from './command';

/**
 * Abstract class that implements get, resolve, and resolveName functions for commands
 *
 * @export
 * @abstract
 * @class CommandHolder
 */
export abstract class CommandHolder {

    /**
     * Commands held in this class
     *
     * @type {Collection<string, Command>}
     * @memberof CommandHolder
     */
    readonly commands: Collection<string, Command>;

    /**
     * Initializes the command collection
     * 
     * @memberof CommandHolder
     */
    constructor() {
        this.commands = new Collection();
    }

    /**
     * Returns a command mapped to the specified name.
     * Throws an error if no command was found.
     *
     * @param {CommandName} command Name to search for
     * @returns
     * @memberof CommandHolder
     */
    get(command: CommandName) {
        let obj = this.commands.get(command);
        if (obj == null)
            throw new Error(`Invalid command name. No command with ${command} was found.`)
        return obj;
    }

    /**
     * Resolves a CommandResolvable to a Command.
     * Throws an error if it was not able to resolve it.
     *
     * @param {CommandResolvable} command Resolvable to resolve
     * @returns
     * @memberof CommandHolder
     */
    resolve(command: CommandResolvable) {
        if (command instanceof Command)
            return command;
        return this.get(command);
    }

    /**
     * Resolves a CommandResolvable to a CommandName.
     * Throws an error if it was not able to resolve it.
     *
     * @param {CommandResolvable} command Resolvable to resolve
     * @returns
     * @memberof CommandHolder
     */
    resolveName(command: CommandResolvable) {
        if (command instanceof Command)
            return command.name;
        return command;
    }

}