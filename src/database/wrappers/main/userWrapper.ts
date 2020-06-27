import { User } from 'discord.js';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { CommandName, CommandResolvable, Commands } from '../../../commands';
import { BBUser, UserCommandScope, UserDoc, UserObject } from '../../schemas/main/user';
import { DocWrapper } from '../docWrapper';
import { container } from 'tsyringe';

/**
 * Wrapper for the user object and document so everything can easily be access through one object
 *
 * @export
 * @class UserWrapper
 * @extends {DocWrapper<UserObject>}
 * @implements {userObject}
 */
export class UserWrapper extends DocWrapper<UserObject> implements BBUser {
    /**
     * User object from Discord.js
     *
     * @type {User}
     * @memberof UserWrapper
     */
    readonly user: User;
    readonly id: string;
    readonly commandLastUsed: {
        [Scope in UserCommandScope]?: {
            [Command in CommandName]: number;
        };
    };

    private readonly commandModule: Commands;

    /**
     * Creates an instance of UserWrapper.
     * 
     * @param {Model<UserDoc>} model Model for users collection
     * @param {User} user User to wrap
     * @memberof UserWrapper
     */
    constructor(model: Model<UserDoc>, user: User) {
        super(model, { id: user.id }, { id: user.id }, keys<UserObject>());
        this.setDataGetters();
        this.user = user;
        this.commandModule = container.resolve(Commands);
    }

    /**
     *  Check if string is valid UserCommandScope
     *
     * @param {UserCommandScope} scope string to check
     * @param {boolean} [noError=false] (default false) if no error should be thrown
     * @returns {scope is UserCommandScope}
     * @memberof UserWrapper
     */
    checkCommandScope(scope: UserCommandScope, noError = false): scope is UserCommandScope {
        let check = scope == 'dm' || scope == 'global';
        if (!noError && !check)
            throw new Error("Scope should be guild id, 'dm' or 'global' but is '" + scope + "'");
        return check;
    }

    /**
     * Gets when command was last used by the user in specified scope
     *
     * @param {UserCommandScope} scope Which scope to check
     * @param {CommandResolvable} command Command to check
     * @returns Timestamp when command was last used (0 when never)
     * @memberof UserWrapper
     */
    async getCommandLastUsed(scope: UserCommandScope, command: CommandResolvable) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        let commandName = this.commandModule.resolveName(command);
        if (!this.commandLastUsed?.[scope]?.[commandName])
            return 0;
        return this.commandLastUsed[scope][commandName];
    }

    /**
     * Sets a new last used timestamp for command in specified scope and global
     *
     * @param {UserCommandScope} scope Scope to set last used timestamp
     * @param {CommandResolvable} command Command to set last used timestamp
     * @param {number} timestamp When command was last used
     * @memberof UserWrapper
     */
    async setCommandLastUsed(scope: UserCommandScope, command: CommandResolvable, timestamp: number) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        let commandName = this.commandModule.resolveName(command);

        let pathValuePairs: [string, any][] = [[`commandLastUsed.${scope}.${command}`, timestamp]];
        if (scope !== 'global')
            pathValuePairs.push([`commandLastUsed.global.${command}`, timestamp]);
        await this.updatePathSet(pathValuePairs);
    }

    /**
     * Deletes all command last used data of a specific scope.
     *
     * @param {UserCommandScope} scope Scope to delete
     * @memberof UserWrapper
     */
    async resetCommandLastUsed(scope: UserCommandScope) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        await this.updatePathUnset(`commandLastUsed.${scope}`);
    }

    /**
     * Not yet implemented
     *
     * @param {string} commandName
     * @returns
     * @memberof UserWrapper
     */
    async canUseCommand(commandName: string) {
        // TODO: implement it with usageLimits
        throw new Error('Not yet implemented');
        /* if (!limits.enabled) return false;
        if (limits.localCooldown && Date.now() < ((await this.getCommandLastUsed(scope, commandName)) + limits.localCooldown))
            return false;
        if (limits.globalCooldown && Date.now() < ((await this.getCommandLastUsed('global', commandName)) + limits.globalCooldown))
            return false;
        return true; */
    }
}