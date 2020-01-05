import { Bot } from "..";
import { userDoc, userObject, CommandUsageLimits, userSchema } from "./schemas";
import { User, UserResolvable, GuildMember, Message, Guild } from "discord.js";
import { resolveUser } from "../utils/resolvers";

/**
 * returns a user wrapper.
 * This function is necessary to ensure that the wrapper is ready when returned
 *
 * @export
 * @param {UserResolvable} userResolvable user that should be wrapped
 * @param {userDoc} [userDoc] Optional user document (doesn't have to query it if provided)
 * @param {boolean} [createDoc] If the document should be created if it wasn't found (won't be saved to the database)
 * @returns
 */
export async function getUserWrapper(userResolvable: UserResolvable, userDoc?: userDoc, createDoc?: boolean) {
    let user = await resolveUser(userResolvable);

    if (!userDoc)
        userDoc = await Bot.database.findUserDoc(user.id);
    if (!userDoc && createDoc)
        userDoc = new Bot.database.mainDB.users({ user: user.id, commandLastUsed: {} });

    return new UserWrapper(userDoc, user);
}

/**
 * Wrapper for user doc/object. Provides additional functions and easier data handling
 *
 * @export
 * @class UserWrapper
 */
export class UserWrapper implements userObject {
    userObject: User;
    doc: userDoc;
    user: string;
    commandLastUsed: { [key: string]: { [key: string]: number; }; };

    /**
     * Creates an instance of UserWrapper with either a existing user doc or a new one (will create one). If userDoc isn't defined it will create one using user. 
     * If both are defined, it will use the exiting, but not manually fetch the user using the user id. 
     * Also the user in the existing doc won't change if there is a different user.
     * 
     * @param {userDoc} userDoc existing user doc
     * @param {User} [user] user for either new doc or existing one
     * @memberof UserWrapper
     */
    constructor(userDoc: userDoc, user: User) {
        this.doc = userDoc;
        this.syncWrapperWithDoc();
        this.userObject = user;
    }

    /**
     * updates every value in the wrapper with the value in the document
     *
     * @private
     * @memberof GuildWrapper
     */
    private syncWrapperWithDoc() {
        for (const key in userSchema.obj)
            this[key] = this.doc[key];
    }

    /**
     * Saves changes to doc that were marked as modified
     *
     * @param {string} [path] Path that should be specially marked (if provided, document doesn't sync with wrapper)
     * @returns The saved document
     * @memberof UserWrapper
     */
    save(path?: string) {
        if (path)
            this.doc.markModified(path);
        for (const key in userSchema.obj)
            this.doc[key] = this[key];
        return this.doc.save();
    }

    /**
     * Marks everything as modified and saves it to the database.
     *
     * @returns The saved document
     * @memberof UserWrapper
     */
    saveAll() {
        for (const key in userSchema.obj) {
            this.doc[key] = this[key];
            this.doc.markModified(key);
        }
        return this.doc.save();
    }

    /**
     * deletes doc from database
     *
     * @returns
     * @memberof UserWrapper
     */
    remove() {
        return this.doc.remove();
    }

    /**
     * returns when the command was last used by the user. returns 0 if it never was used before
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} command command name
     * @returns timestamp when the command was last used by the user
     * @memberof UserWrapper
     */
    getCommandLastUsed(scope: string, command: string) {
        if (!this.commandLastUsed || !this.commandLastUsed[scope] || !this.commandLastUsed[scope][command])
            return 0;
        return this.commandLastUsed[scope][command];
    }

    /**
     * Sets when the user last used the command. always also sets in global scope. 
     * If no timestamp was provided the last used timestamp will be removed
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} command command name 
     * @param {number} timestamp timestamp, when the command will be useable again
     * @param {boolean} [save=true] if it should save the changes to the database
     * @returns the changed user doc if save is true
     * @memberof UserWrapper
     */
    async setCommandLastUsed(scope: string, command: string, timestamp: number, save: boolean = true) {
        if (isNaN(Number(scope)) && scope != 'dm' && scope != 'global')
            throw new Error("scope should be guild id, 'dm' or 'global' but is '" + scope + "'");

        if (!this.commandLastUsed[scope]) this.commandLastUsed[scope] = {};
        if (timestamp)
            this.commandLastUsed[scope][command] = timestamp;
        else
            delete this.commandLastUsed[scope][command];

        if (scope !== 'global')
            this.setCommandLastUsed('global', command, timestamp, false);

        this.doc.markModified(`commandLastUsed.${scope}.${command}`);
        if (save) await this.save();

        return this.doc;
    }

    /**
     * deleted the cooldown infos of a specific command. Saves changes to database if save is true (default)
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {boolean} [save=true] if it should save the changes to the database
     * @returns the changed user doc if something was changed and save is true
     * @memberof UserWrapper
     */
    resetCommandLastUsed(scope: string, save: boolean = true) {
        if (!this.commandLastUsed[scope]) return;
        delete this.commandLastUsed[scope];

        this.doc.markModified('commandLastUsed');
        if (save) this.save();
    }

    /**
     * If this user can use the command based on usage limits
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} commandName name of the command
     * @param {CommandUsageLimits} limits usage limits
     * @returns boolean if the user can use the command
     * @memberof UserWrapper
     */
    canUseCommand(scope: string, commandName: string, limits: CommandUsageLimits) {
        if (!limits.enabled) return false;
        if (limits.localCooldown && Date.now() < this.getCommandLastUsed(scope, commandName) + limits.localCooldown)
            return false;
        if (limits.globalCooldown && Date.now() < this.getCommandLastUsed('global', commandName) + limits.globalCooldown)
            return false;
        return true;
    }
}