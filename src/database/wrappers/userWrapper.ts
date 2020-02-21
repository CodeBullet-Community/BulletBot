import { Snowflake, User } from 'discord.js';
import { keys } from 'ts-transformer-keys';

import { Bot } from '../..';
import { CommandName } from '../../commands';
import { CommandScope, CommandUsageLimits, UserObject } from '../schemas';
import { Wrapper } from './wrapper';

/**
 * Wrapper for user doc/object. Provides additional functions and easier data handling
 *
 * @export
 * @class UserWrapper
 */
/**
 * Wrapper for the user object and document so everything can easily be access through one object
 *
 * @export
 * @class UserWrapper
 * @extends {Wrapper<UserObject>}
 * @implements {userObject}
 */
export class UserWrapper extends Wrapper<UserObject> implements UserObject {
    user: User;
    id: string;
    commandLastUsed: { [key: string]: { [key: string]: number; }; };

    /**
     * Creates an instance of UserWrapper.
     * 
     * @param {userDoc} userDoc existing user doc
     * @param {User} [user] user for either new doc or existing one
     * @memberof UserWrapper
     */
    constructor(id: Snowflake, user: User) {
        super(Bot.database.mainDB.users, { id: id }, ['id'], keys<UserObject>());
        this.data.id = id;
        this.user = user;
    }

    private checkCommandScope(scope: string) {
        if (isNaN(Number(scope)) && scope != 'dm' && scope != 'global')
            throw new Error("Scope should be guild id, 'dm' or 'global' but is '" + scope + "'");
    }

    /**
     * returns when the command was last used by the user. returns 0 if it never was used before
     *
     * @param {CommandScope} scope guild id / 'dm' / 'global'
     * @param {string} command command name
     * @returns timestamp when the command was last used by the user
     * @memberof UserWrapper
     */
    async getCommandLastUsed(scope: string, command: CommandName) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        if (!this.commandLastUsed || !this.commandLastUsed[scope] || !this.commandLastUsed[scope][command])
            return 0;
        return this.commandLastUsed[scope][command];
    }

    /**
     * Sets when the user last used the command. always also sets in global scope
     *
     * @param {CommandScope} scope Guild id / 'dm' / 'global'
     * @param {string} command Name of the command
     * @param {number} timestamp When the command was last used
     * @returns The timestamp if it was successfully set
     * @memberof UserWrapper
     */
    async setCommandLastUsed(scope: CommandScope, command: CommandName, timestamp: number) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        let query = { $set: {} };
        query.$set[`commandLastUsed.${scope}.${command}`] = timestamp;
        if (scope !== 'global')
            query.$set[`commandLastUsed.global.${command}`] = timestamp;
        await this.update(query);
        this._setCommandLastUsed(scope, command, timestamp);
        this._setCommandLastUsed('global', command, timestamp);
        return this.data.commandLastUsed[scope][command] = timestamp;
    }

    /**
     * Private helper function that only sets the local values
     *
     * @private
     * @param {CommandScope} scope Guild id / 'dm' / 'global'
     * @param {string} command Name of the command
     * @param {number} timestamp When the command was last used
     * @memberof UserWrapper
     */
    private _setCommandLastUsed(scope: CommandScope, command: CommandName, timestamp: number) {
        if (!this.data.commandLastUsed[scope]) this.data.commandLastUsed[scope] = {};
        this.data.commandLastUsed[scope][command] = timestamp;
    }

    /**
     * Deletes all command last used infos of a specific scope.
     *
     * @param {CommandScope} scope What scope to delete
     * @returns The deleted scope if it was deleted
     * @memberof UserWrapper
     */
    async resetCommandLastUsed(scope: CommandScope) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        if (!this.commandLastUsed[scope]) return;
        let query = { $unset: {} };
        query.$unset[scope] = 0;
        await this.update(query);
        let deletedScope = this.commandLastUsed[scope];
        delete this.data.commandLastUsed[scope];
        return deletedScope;
    }

    /**
     * If this user can use the command based on usage limits
     *
     * @param {CommandScope} scope guild id / 'dm' / 'global'
     * @param {string} commandName name of the command
     * @param {CommandUsageLimits} limits usage limits
     * @returns boolean if the user can use the command
     * @memberof UserWrapper
     */
    async canUseCommand(scope: CommandScope, commandName: string, limits: CommandUsageLimits) {
        if (!limits.enabled) return false;
        if (limits.localCooldown && Date.now() < ((await this.getCommandLastUsed(scope, commandName)) + limits.localCooldown))
            return false;
        if (limits.globalCooldown && Date.now() < ((await this.getCommandLastUsed('global', commandName)) + limits.globalCooldown))
            return false;
        return true;
    }
}