import { User, GuildMember, Message, Guild } from "discord.js";
import { Bot } from "..";
import { CommandResolvable, commandInterface } from "../commands";

/**
  * Resolves a UserResolvable to a User object.
  * @param {UserResolvable} user The UserResolvable to identify
  * @returns {?User}
  */
export async function resolveUser(user) {
    if (user instanceof User) return user;
    if (typeof user === 'string') return this.client.fetchUser(user);
    if (user instanceof GuildMember) return user.user;
    if (user instanceof Message) return user.author;
    if (user instanceof Guild) return user.owner;
    return null;
}

/**
 * resolves a command resolvable to a command interface
 *
 * @export
 * @param {CommandResolvable} command
 * @returns {commandInterface}
 */
export function resolveCommandResolvable(command: CommandResolvable): commandInterface {
    if (typeof command === "string")
        return Bot.commands.get(command);
    return command;
}