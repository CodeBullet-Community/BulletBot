import { Bot } from '..';
import { commandInterface, CommandResolvable } from '../commands';

// TODO: move this to Commands
/**
 * resolves a command resolvable to a command interface
 *
 * @export
 * @param {CommandResolvable} command
 * @returns {commandInterface}
 */
export function resolveCommand(command: CommandResolvable): commandInterface {
    if (typeof command === "string")
        return Bot.commands.get(command);
    return command;
}