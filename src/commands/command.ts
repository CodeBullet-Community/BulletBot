
export type CommandName = string;

export type CommandResolvable = CommandName | Command;

export abstract class Command {

    readonly name: CommandName;
    readonly aliases?: string[];
    readonly dm: boolean;
    readonly togglable: boolean;
    readonly permLevel: number;
    readonly localCooldown?: number;
    readonly globalCooldown?: number;
}