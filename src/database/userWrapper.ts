import { Bot } from "..";
import { userDoc, userObject } from "./schemas";
import { User } from "discord.js";

/**
 * Wrapper for user doc/object. Provides additional functions and easier data handling
 *
 * @export
 * @class UserWrapper
 */
export class UserWrapper {
    user: User;
    commandCooldown: {
        // guild id, 'dm' and 'global'
        [key: string]: {
            // command name
            [key: string]: number; // timestamp until it can be reused again
        };
    };
    doc: userDoc;

    /**
     * Creates an instance of UserWrapper with either a existing user doc or a new one (will create one). If userDoc isn't defined it will create one using user. 
     * If both are defined, it will use the exiting, but not manually fetch the user using the user id. 
     * Also the user in the existing doc won't change if there is a different user.
     * 
     * @param {userDoc} userDoc existing user doc
     * @param {User} [user] user for either new doc or existing one
     * @memberof UserWrapper
     */
    constructor(userDoc: userDoc, user?: User) {
        this.user = user;
        if (userDoc) {
            this.doc = userDoc;
            var userObject: userObject = this.doc.toObject();
            if (!this.user)
                Bot.client.fetchUser(userObject.user).then(user => this.user)
            this.commandCooldown = userObject.commandCooldown;
        } else {
            if (!user) throw new Error("Both userDoc and user weren't specified");

            this.commandCooldown = {};
            this.doc = new Bot.database.mainDB.users({ user: user.id, commandCooldown: {} });
        }
    }

    /**
     * saves changes to doc
     *
     * @returns
     * @memberof UserWrapper
     */
    save() {
        this.doc.commandCooldown = this.commandCooldown;
        this.doc.markModified('commandCooldown');
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
     * returns the cooldown timestamp of a command. Returns 0 when no cooldown was specified.
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} command command name
     * @returns timestamp, when the command will be useable again
     * @memberof UserWrapper
     */
    getCooldown(scope: string, command: string) {
        if (!this.commandCooldown || !this.commandCooldown[scope] || !this.commandCooldown[scope][command])
            return 0;
        return this.commandCooldown[scope][command];
    }

    /**
     * sets the cooldown timestamp of a specific command in a specific scope. If save is true (default) it will also save it to the database. 
     * The save function here more efficient then calling save() afterwards.
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {string} command command name 
     * @param {number} timestamp timestamp, when the command will be useable again
     * @param {boolean} [save=true] if it should save the changes to the database
     * @returns the changed user doc if save is true
     * @memberof UserWrapper
     */
    setCooldown(scope: string, command: string, timestamp: number, save: boolean = true) {
        if (isNaN(Number(scope)) && scope != 'dm' && scope != 'global')
            throw new Error("scope should be guild id, 'dm' or 'global' but is '" + scope + "'");

        if (!this.commandCooldown) this.commandCooldown = {}
        if (!this.commandCooldown[scope]) this.commandCooldown[scope] = {};
        if (timestamp) {
            this.commandCooldown[scope][command] = timestamp;
        } else {
            delete this.commandCooldown[scope][command];
        }

        if (save) {
            this.doc.commandCooldown = this.commandCooldown;
            this.doc.markModified(`commandCooldown.${scope}.${command}`);
            return this.doc.save();
        }
    }

    /**
     * deleted the cooldown infos of a specific command. Saves changes to database if save is true (default)
     *
     * @param {string} scope guild id / 'dm' / 'global'
     * @param {boolean} [save=true] if it should save the changes to the database
     * @returns the changed user doc if something was changed and save is true
     * @memberof UserWrapper
     */
    resetCooldown(scope: string, save: boolean = true) {
        if (!this.commandCooldown[scope]) return;
        delete this.commandCooldown[scope];
        if (save) {
            this.doc.commandCooldown = this.commandCooldown;
            this.doc.markModified('commandCooldown');
            return this.doc.save();
        }
    }
}