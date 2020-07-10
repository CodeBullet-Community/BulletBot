
/**
 * String that should represent a command name
 */
export type CommandName = string;

/**
 * Types that are resolvable to a command
 */
export type CommandResolvable = CommandName | Command;

/**
 * Represents a command that gets initialized on startup
 *
 * @export
 * @abstract
 * @class Command
 */
export abstract class Command {

    /**
     * Main name of command
     *
     * @type {CommandName}
     * @memberof Command
     */
    readonly name: CommandName;
    /**
     * Aliases for the command
     *
     * @type {string[]}
     * @memberof Command
     */
    readonly aliases?: string[];
    /**
     * If the command can be used in dms
     *
     * @type {boolean}
     * @memberof Command
     */
    readonly dm: boolean;
    /**
     * If the command is togglable by guild admins
     *
     * @type {boolean}
     * @memberof Command
     */
    readonly togglable: boolean;
    /**
     * Which permLevel the command requires to be executed
     *
     * @type {number}
     * @memberof Command
     */
    readonly permLevel: number;
    /**
     * The local cooldown in milliseconds
     *
     * @type {number}
     * @memberof Command
     */
    readonly localCooldown?: number;
    /**
     * The global cooldown in milliseconds
     *
     * @type {number}
     * @memberof Command
     */
    readonly globalCooldown?: number;
}