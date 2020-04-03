import { User } from 'discord.js';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { CommandName } from '../../../commands';
import { UserCommandScope, UserDoc, UserObject } from '../../schemas/main/user';
import { DocWrapper } from '../docWrapper';

/**
 * Wrapper for the user object and document so everything can easily be access through one object
 *
 * @export
 * @class UserWrapper
 * @extends {DocWrapper<UserObject>}
 * @implements {userObject}
 */
export class UserWrapper extends DocWrapper<UserObject> implements UserObject {
    /**
     * User object from Discord.js
     *
     * @type {User}
     * @memberof UserWrapper
     */
    user: User;
    /**
     * ID of the user
     *
     * @type {string}
     * @memberof UserWrapper
     */
    readonly id: string;
    /**
     * When the user last used a command in what scope
     *
     * @type {{ [key: string]: { [key: string]: number; }; }}
     * @memberof UserWrapper
     */
    readonly commandLastUsed: {
        [Scope in UserCommandScope]?: {
            [Command in CommandName]: number;
        };
    };

    /**
     * Creates an instance of UserWrapper.
     * 
     * @param {Model<UserDoc>} model Model for users collection
     * @param {User} user User to wrap
     * @memberof UserWrapper
     */
    constructor(model: Model<UserDoc>, user: User) {
        super(model, { id: user.id }, { id: user.id }, keys<UserObject>());
        this.user = user;
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
     * @param {CommandName} command Command to check
     * @returns Timestamp when command was last used (0 when never)
     * @memberof UserWrapper
     */
    async getCommandLastUsed(scope: UserCommandScope, command: CommandName) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        if (!this.commandLastUsed?.[scope]?.[command])
            return 0;
        return this.commandLastUsed[scope][command];
    }

    /**
     * Sets a new last used timestamp for command in specified scope and global
     *
     * @param {UserCommandScope} scope Scope to set last used timestamp
     * @param {CommandName} command Command to set last used timestamp
     * @param {number} timestamp When command was last used
     * @memberof UserWrapper
     */
    async setCommandLastUsed(scope: UserCommandScope, command: CommandName, timestamp: number) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);

        let query = { $set: {} };
        query.$set[`commandLastUsed.${scope}.${command}`] = timestamp;
        if (scope !== 'global')
            query.$set[`commandLastUsed.global.${command}`] = timestamp;
        await this.update(query);

        let tempData = this.cloneData();
        this._setCommandLastUsed(tempData, scope, command, timestamp);
        this._setCommandLastUsed(tempData, 'global', command, timestamp);
        this.data.next(tempData);
    }

    /**
     * Private helper function that sets commandLastUsed in provided data
     *
     * @private
     * @param {Partial<UserObject>} data UserObject that should be manipulated
     * @param {UserCommandScope} scope Scope where to set commandLastUsed
     * @param {string} commandName Name of the command
     * @param {number} timestamp When the command was last used
     * @memberof UserWrapper
     */
    private _setCommandLastUsed(data: Partial<UserObject>, scope: UserCommandScope, commandName: CommandName, timestamp: number) {
        if (!data.commandLastUsed[scope]) data.commandLastUsed[scope] = {};
        data.commandLastUsed[scope][commandName] = timestamp;
    }

    /**
     * Deletes all command last used infos of a specific scope.
     *
     * @param {UserCommandScope} scope What scope to delete
     * @returns The deleted scope if it had content before
     * @memberof UserWrapper
     */
    async resetCommandLastUsed(scope: UserCommandScope) {
        await this.load('commandLastUsed');
        this.checkCommandScope(scope);
        if (!this.commandLastUsed[scope]) return undefined;

        let query = { $unset: {} };
        query.$unset[scope] = 0;
        await this.update(query);

        let deletedScope = this.commandLastUsed[scope];

        let tempData = this.cloneData();
        delete tempData.commandLastUsed[scope];
        this.data.next(tempData);

        return deletedScope;
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