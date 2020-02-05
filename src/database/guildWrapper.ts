import mongoose = require('mongoose');
import { Guild, GuildMember, UserResolvable, GuildResolvable, GuildMemberResolvable, RoleResolvable, Snowflake } from "discord.js";
import { CommandUsageLimits, guildDoc, UsageLimits, guildObject, guildSchema, GuildRank, guildRanks } from "./schemas";
import { Bot } from '..';
import { permLevels } from '../utils/permissions';
import { CommandResolvable } from '../commands';
import { resolveCommand, resolveGuildMember, resolveRole, resolveUserID } from '../utils/resolvers';

export type GuildWrapperResolvable = GuildWrapper | GuildResolvable;

/**
 * Wrapper for the guild object and document so everything can easily be access through one object
 *
 * @export
 * @class GuildWrapper
 * @implements {guildObject}
 */
export class GuildWrapper implements guildObject {
    guild: Guild;
    id: string;
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
    ranks: {
        admins: string[];
        mods: string[];
        immune: string[];
    };
    commandSettings: {
        [key: string]: {
            _enabled: boolean;
            [key: string]: any;
        }
    };
    megalog: {
        ignoreChannels: string[];
        channelCreate?: string;
        channelDelete?: string;
        channelUpdate?: string;
        ban?: string;
        unban?: string;
        memberJoin?: string;
        memberLeave?: string;
        nicknameChange?: string;
        memberRolesChange?: string;
        guildNameChange?: string;
        messageDelete?: string;
        attachmentCache?: string;
        messageEdit?: string;
        reactionAdd?: string;
        reactionRemove?: string;
        roleCreate?: string;
        roleDelete?: string;
        roleUpdate?: string;
        voiceTranfer?: string;
        voiceMute?: string;
        voiceDeaf?: string;
    };

    /**
     * Creates an instance of GuildWrapper.
     *
     * @param {guildDoc} guildObject guild document object
     * @param {Guild} [guild] optional guild object (so constructor doesn't have to search for it)
     * @memberof GuildWrapper
     */
    constructor(guildObject: guildObject, guild?: Guild) {
        for (const key in guildObject)
            this[key] = guildObject[key];

        if (guild)
            this.guild = guild;
        else
            this.guild = Bot.client.guilds.get(guildObject.id);
    }

    private tracePathSet(object, path: string, value: any) {
        let pathArray = path.split('.');
        let i;
        for (i = 0; i < pathArray.length - 1; i++)
            object = object[pathArray[i]];
        object[path[i]] = value;
    }

    /**
     * Resynchronizes the cache with the database
     *
     * @returns The resynchronized Wrapper if the document was found in the database
     * @memberof GuildWrapper
     */
    async resync(fields?: string[]) {
        let doc = await Bot.database.findGuildDoc(this.id, fields);
        if (!doc) return undefined;
        let obj = doc.toObject({ minimize: false });
        for (const field of fields)
            this.tracePathSet(this, field, this.tracePath(obj, field));
        return this;
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
     * @memberof GuildWrapper
     */
    async setPrefix(prefix?: string) {
        let query: any = { $set: { prefix: prefix } };
        if (!prefix) query = { $unset: { prefix: 0 } };
        await Bot.database.mainDB.guilds.updateOne({ id: this.id }, query).exec();
        this.prefix = prefix;
    }

    /**
     * returns the case log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCaseChannel() {
        if (!this.caseChannel) return undefined;
        return this.guild.channels.get(this.caseChannel);
    }

    /**
     * returns the log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    getLogChannel() {
        if (!this.logChannel) return undefined;
        return this.guild.channels.get(this.logChannel);
    }

    /**
     * returns promise with specified case document
     *
     * @param {number} caseID case ID of case to be returned
     * @returns
     * @memberof GuildWrapper
     */
    getCase(caseID: number) {
        return Bot.caseLogger.findByCase(this.id, caseID);
    }

    /**
     * deletes the specified case from the database
     *
     * @param {number} caseID case that should be deleted
     * @returns
     * @memberof GuildWrapper
     */
    removeCase(caseID: number) {
        return Bot.caseLogger.deleteCase(this.id, caseID);
    }

    /**
     * returns a promise with an array of all cases
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCases() {
        return Bot.caseLogger.findByGuild(this.id);
    }

    /**
     * Adds user/role to admin/mod/immune rank
     *
     * @param {GuildRank} rank Which rank the user/role should be added to
     * @param {Snowflake} snowflake Role/User id to add to the rank
     * @returns Resulting list of IDs in the rank
     * @memberof GuildWrapper
     */
    async addToRank(rank: GuildRank, snowflake: Snowflake) {
        if (!guildRanks.includes(rank)) return undefined;
        if (this.ranks[rank].includes(snowflake)) return undefined;
        let query = { $addToSet: {} };
        query.$addToSet[`ranks.${rank}`] = [snowflake];
        await Bot.database.mainDB.guilds.updateOne({ id: this.id }, query).exec();
        this.ranks[rank].push(snowflake);
        return this.ranks[rank];
    }

    /**
     * Removes user/role from the admin/mod/immune rank
     *
     * @param {GuildRank} rank Rank the user should be removed from
     * @param {Snowflake} snowflake Role/User id to remove to the rank
     * @returns Resulting list of IDs in the rank
     * @memberof GuildWrapper
     */
    async removeFromRank(rank: GuildRank, snowflake: Snowflake) {
        if (!guildRanks.includes(rank)) return undefined;
        if (!this.ranks[rank].includes(snowflake)) return undefined;
        let query = { $pull: {} };
        query.$pull[`ranks.${rank}`] = snowflake;
        await Bot.database.mainDB.guilds.updateOne({ id: this.id }, query).exec();
        this.ranks[rank].splice(this.ranks[rank].indexOf(snowflake), 1);
        return this.ranks[rank];
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
        let usageLimits = this.getUsageLimits(`commands.${command.name}`);
        return Bot.commands.getCommandUsageLimits(command, usageLimits);
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
        let member = await resolveGuildMember(this.guild, memberResolvable);

        // if bot master
        if (Bot.settings.getBotMasters().includes(member.id))
            return permLevels.botMaster;

        // if admin
        if (member.hasPermission('ADMINISTRATOR'))
            return permLevels.admin;

        if (this.ranks.admins.includes(member.id)
            || member.roles.find(role => this.ranks.admins.includes(role.id)))
            return permLevels.admin;
        if (this.ranks.mods.includes(member.id)
            || member.roles.find(role => this.ranks.mods.includes(role.id)))
            return permLevels.mod;
        if (this.ranks.immune.includes(member.id)
            || member.roles.find(role => this.ranks.immune.includes(role.id)))
            return permLevels.immune;
        return permLevels.member;
    }

    /**
     * Gets all snowflakes of a certain rank and checks if that rank exists
     *
     * @param {GuildRank} rank Rank to get snowflakes of
     * @returns {Snowflake[]} Snowflakes of the given rank
     * @memberof GuildWrapper
     */
    getRankIDs(rank: GuildRank): Snowflake[] {
        if (!guildRanks.includes(rank))
            throw new Error(`Invalid Input. Rank should be either 'admins', 'mods' or 'immune' but was: ${rank}`);
        return this.ranks[rank];
    }

    /**
     * Only provides GuildMember snowflakes of a certain rank
     *
     * @param {GuildRank} rank Rank to get GuildMember snowflakes of
     * @returns {Snowflake[]} GuildMember snowflakes of a certain rank
     * @memberof GuildWrapper
     */
    getRankMemberIDs(rank: GuildRank): Snowflake[] {
        return this.getRankIDs(rank).filter(id => !this.guild.roles.get(id));
    }

    /**
     * Only provides GuildMembers of a certain rank
     * 
     * @param {GuildRank} rank Rank to get GuildMembers of
     * @returns GuildMembers of a certain rank
     * @memberof GuildWrapper
     */
    async getRankMembers(rank: GuildRank) {
        let userIDs = this.getRankMemberIDs(rank);
        let users = userIDs.map(id => this.guild.fetchMember(id))
        return await Promise.all(users);
    }

    /**
     * Only provides Role snowflakes of a certain rank
     *
     * @param {GuildRank} rank Rank to get Role snowflakes of
     * @returns {Snowflake[]} Role snowflakes of a certain rank
     * @memberof GuildWrapper
     */
    getRankRoleIDs(rank: GuildRank): Snowflake[] {
        return this.getRankIDs(rank).filter(id => this.guild.roles.get(id));
    }

    /**
     * Only provides Role of a certain rank
     *
     * @param {GuildRank} rank Rank to get Roles of
     * @returns Roles of a certain rank
     * @memberof GuildWrapper
     */
    getRankRoles(rank: GuildRank) {
        return this.getRankRoleIDs(rank).map(id => this.guild.roles.get(id));
    }

}