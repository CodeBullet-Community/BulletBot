import mongoose = require('mongoose');
import { Guild, GuildMember, UserResolvable, GuildResolvable } from "discord.js";
import { CommandUsageLimits, guildDoc, UsageLimits, guildObject, guildSchema } from "./schemas";
import { Bot } from '..';
import { getPermLevel } from '../utils/permissions';
import { CommandResolvable } from '../commands';
import { resolveCommandResolvable } from '../utils/resolvers';

/**
 * returns a GuildWrapper for the specified guild. 
 * This helper function is necessary to ensure that the wrapper is ready when it's returned
 *
 * @export
 * @param {GuildResolvable} guild
 * @returns
 */
export async function getGuildWrapper(guild: GuildResolvable) {
    let guildID = guild.toString();
    if (guild instanceof Guild)
        guildID = guild.id;

    let guildDoc = await Bot.database.findGuildDoc(guildID);
    return new GuildWrapper(guildDoc, guild instanceof Guild ? guild : undefined);
}

/**
 * Wrapper for the guild object and document so everything can easily be access through one object
 *
 * @export
 * @class GuildWrapper
 * @implements {guildObject}
 */
export class GuildWrapper implements guildObject {
    guildObject: Guild;
    doc: guildDoc;
    guild: string;
    logChannel: string;
    caseChannel: string;
    totalCases: number;
    logs: mongoose.Schema.Types.ObjectId[];
    staff: mongoose.Schema.Types.ObjectId;
    modmailChannel: string;
    webhooks: { [key: string]: mongoose.Schema.Types.ObjectId[]; };
    locks: { [key: string]: { until?: number; allowOverwrites: string[]; neutralOverwrites: string[]; }; };
    usageLimits?: UsageLimits;

    /**
     * Creates an instance of GuildWrapper.
     *
     * @param {guildDoc} guildDoc guild document
     * @param {Guild} [guild] optional guild object (so constructor doesn't have to search for it)
     * @memberof GuildWrapper
     */
    constructor(guildDoc: guildDoc, guild?: Guild) {
        this.doc = guildDoc;
        this.syncWrapperWithDoc();

        if (guild)
            this.guildObject = guild;
        else
            this.guildObject = Bot.client.guilds.get(guildDoc.guild);
    }

    /**
     * updates every value in the wrapper with the value in the document
     *
     * @private
     * @memberof GuildWrapper
     */
    private syncWrapperWithDoc() {
        let object: guildObject = this.doc.toObject();
        for (const key in guildSchema.obj)
            this[key] = object[key];
    }

    /**
     * returns the case log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCaseChannel() {
        if (!this.doc.caseChannel) return undefined;
        return this.guildObject.channels.get(this.doc.caseChannel);
    }

    /**
     * returns the log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    getLogChannel() {
        if (!this.doc.logChannel) return undefined;
        return this.guildObject.channels.get(this.doc.logChannel);
    }

    /**
     * returns promise with specified case document
     *
     * @param {number} caseID case ID of case to be returned
     * @returns
     * @memberof GuildWrapper
     */
    getCase(caseID: number) {
        return Bot.caseLogger.findByCase(this.doc.guild, caseID);
    }

    /**
     * deletes the specified case from the database
     *
     * @param {number} caseID case that should be deleted
     * @returns
     * @memberof GuildWrapper
     */
    removeCase(caseID: number) {
        return Bot.caseLogger.deleteCase(this.doc.guild, caseID);
    }

    /**
     * returns a promise with an array of all cases
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCases() {
        return Bot.caseLogger.findByGuild(this.doc.guild);
    }

    /**
     * get permission level of user / member
     *
     * @param {UserResolvable} user user of which to get permission level
     * @returns permission level or undefined if member was not found
     * @memberof GuildWrapper
     */
    async getUserPermLevel(user: UserResolvable) {
        if (user instanceof GuildMember)
            return getPermLevel(user);
        return getPermLevel(await this.guildObject.fetchMember(user));
    }

    /**
     * adds user/role to admin/mod/immune rank
     *
     * @param {('admins' | 'mods' | 'immune')} rank which rank the user/role should be added to
     * @param {string} [roleID] id of role to add
     * @param {string} [userID] id of user to add
     * @returns if added was successful
     * @memberof GuildWrapper
     */
    addToRank(rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        return Bot.database.addToRank(this.doc.guild, rank, roleID, userID);
    }

    /**
     * removes user/role from the admin/mod/immune rank
     *
     * @param {('admins' | 'mods' | 'immune')} rank rank the user should be removed from
     * @param {string} [roleID] id of role to remove
     * @param {string} [userID] id of user to remove
     * @returns if removal was successful
     * @memberof GuildWrapper
     */
    removeFromRank(rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        return Bot.database.removeFromRank(this.doc.guild, rank, roleID, userID);
    }

    // TODO: add functions for webhooks
    // TODO: add functions for adding/removing locks

    /**
     * Gets a property at the specified path
     *
     * @private
     * @param {*} object object to trace
     * @param {string} path path of requested property
     * @returns value of property
     * @memberof GuildWrapper
     */
    private tracePath(object, path: string) {
        let current = object;
        for (const property of path.split('.')) {
            if (current === undefined) return undefined;
            current = current[property];
        }
        return current;
    }

    /**
     * Merges two objects with the second taking priority.
     *
     * @private
     * @param {*} object1 object with less priority
     * @param {*} object2 object with more priority
     * @returns merged object
     * @memberof GuildWrapper
     */
    private mergeObject(object1, object2) {
        let merged = Object.assign({}, object1);
        for (const key in object2) {
            if (typeof object2[key] === 'object') {
                merged[key] = this.mergeObject(object1[key], object2);
                continue;
            }
            merged[key] = object2[key];
        }
        return merged;
    }

    /**
     * Merges the usage limits of the guild and the global settings at the specific path.
     *
     * @param {string} [path=''] What part to merge (default everything)
     * @returns Merge usage limits
     * @memberof GuildWrapper
     */
    getUsageLimits(path: string = '') {
        let globalUsageLimits = this.tracePath(Bot.settings.usageLimits, path) || {};
        let guildUsageLimits = this.tracePath(this.usageLimits, path) || {};
        return this.mergeObject(globalUsageLimits, guildUsageLimits);
    }

    /**
     * Gets command usage limits for specified command
     *
     * @param {CommandResolvable} commandResolvable Command for which to get usage limits
     * @returns {CommandUsageLimits} Usage limits for specified command
     * @memberof GuildWrapper
     */
    getCommandUsageLimits(commandResolvable: CommandResolvable): CommandUsageLimits {
        let command = resolveCommandResolvable(commandResolvable);
        let usagelimits = this.getUsageLimits(`commands.${command.name}`);
        return Bot.commands.getCommandUsageLimits(command, usagelimits);
    }

}