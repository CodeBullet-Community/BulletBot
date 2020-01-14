import mongoose = require('mongoose');
import { Guild, GuildMember, UserResolvable, GuildResolvable, GuildMemberResolvable } from "discord.js";
import { CommandUsageLimits, guildDoc, UsageLimits, guildObject, guildSchema, staffDoc } from "./schemas";
import { Bot } from '..';
import { getPermLevel, permLevels } from '../utils/permissions';
import { CommandResolvable } from '../commands';
import { resolveCommand, resolveGuildMember } from '../utils/resolvers';

export type GuildWrapperResolvable = GuildWrapper | GuildResolvable;

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
    staffDoc: staffDoc;
    guild: string;
    prefix: string;
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
     * Saves changes to doc that were marked as modified
     *
     * @param {string} [path] Path that should be specially marked (if provided, document doesn't sync with wrapper)
     * @returns The saved document
     * @memberof UserWrapper
     */
    save(path?: string) {
        if (path)
            this.doc.markModified(path);
        for (const key in guildSchema.obj)
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
        for (const key in guildSchema.obj) {
            this.doc[key] = this[key];
            this.doc.markModified(key);
        }
        return this.doc.save();
    }

    /**
     * Gets the staff document and caches it for if this function is called again.
     *
     * @returns Staff document of this guild
     * @memberof GuildWrapper
     */
    async getStaffDoc() {
        if (this.staffDoc) return this.staffDoc;
        this.staffDoc = await Bot.database.mainDB.staff.findOne({ guild: this.guild }).exec();
        if (!this.staffDoc) throw new Error(`Staff document for guild ${this.guild} not found`);
        return this.staffDoc;
    }

    /**
     * Returns the prefix that the guild uses
     *
     * @returns Prefix
     * @memberof GuildWrapper
     */
    getPrefix() {
        if (this.prefix) return this.prefix;
        return Bot.settings.prefix;
    }

    /**
     * Sets a new prefix for the server
     *
     * @param {string} prefix New prefix (If not provided, prefix will be reset)
     * @param {boolean} [save=true] If it should be saved directly
     * @memberof GuildWrapper
     */
    setPrefix(prefix?: string, save = true) {
        this.prefix = prefix;
        this.doc.prefix = prefix;
        this.doc.markModified('prefix');
        if (save) this.save();
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
        let command = resolveCommand(commandResolvable);
        let usagelimits = this.getUsageLimits(`commands.${command.name}`);
        return Bot.commands.getCommandUsageLimits(command, usagelimits);
    }

    /**
     *  returns perm level of member
     *  - member: 0
     *  - immune: 1
     *  - mod: 2
     *  - admin: 3 
     *  - botMaster: 4
     *
     * @export
     * @param {GuildMemberResolvable} member member to get perm level from
     * @returns perm level
     */
    async getPermLevel(memberResolvable: GuildMemberResolvable): Promise<permLevels> {
        let member = await resolveGuildMember(this.guildObject, memberResolvable);

        // if bot master
        if (Bot.settings.getBotMasters().includes(member.id))
            return permLevels.botMaster;

        // if admin
        if (member.hasPermission('ADMINISTRATOR'))
            return permLevels.admin;

        let staffDoc = await this.getStaffDoc();
        let ranks = ['admin', 'mod', 'immune'];
        // iterate through all privileged ranks
        for (const rank of ranks) {
            let rankStaff = staffDoc[rank + 's'];
            // is one of the staff user
            if (!rankStaff.users.includes(member.user.id)) continue;
            // has one of the staff roles
            if (!member.roles.find(role => rankStaff.roles.includes(role.id))) continue;
            return permLevels[rank];
        }
        return permLevels.member;
    }

}