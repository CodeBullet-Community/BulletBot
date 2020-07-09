
export abstract class Command {

    readonly name: string;
    readonly aliases?: string[];
    readonly dm: boolean;
    readonly togglable: boolean;
    readonly permLevel: number;
    readonly localCooldown?: number;
    readonly globalCooldown?: number;
}