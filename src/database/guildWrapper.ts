import mongoose = require('mongoose');
import { Guild, GuildMember, UserResolvable, GuildResolvable, GuildMemberResolvable, RoleResolvable, Snowflake, ChannelResolvable, TextChannel } from "discord.js";
import { CommandUsageLimits, guildDoc, UsageLimits, guildObject, guildSchema, GuildRank, guildRanks, CommandSettings, MegalogFunction, megalogGroups } from "./schemas";
import { Bot } from '..';
import { permLevels } from '../utils/permissions';
import { CommandResolvable } from '../commands';
import { resolveCommand, resolveGuildMember, resolveChannel, resolveChannelID } from '../utils/resolvers';
import { Wrapper } from './wrapper';
import _, { PropertyPath } from "lodash";
import { keys } from 'ts-transformer-keys';

export type GuildWrapperResolvable = GuildWrapper | GuildResolvable;

/**
 * Wrapper for the guild object and document so everything can easily be access through one object
 *
 * @export
 * @class GuildWrapper
 * @implements {guildObject}
 */
export class GuildWrapper extends Wrapper<guildObject> implements guildObject {
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
        [key: string]: CommandSettings
    };
    megalog: { ignoreChannels: string[]; } & { [T in MegalogFunction]: string };

    /**
     * Creates an instance of GuildWrapper.
     *
     * @param {Snowflake} id ID of the guild
     * @param {Guild} [guild] optional guild object (so constructor doesn't have to search for it)
     * @memberof GuildWrapper
     */
    constructor(id: Snowflake, guild?: Guild) {
        super(Bot.database.mainDB.guilds, { id: id }, ['id'], keys<guildObject>());
        this.data.id = id;

        if (guild)
            this.guild = guild;
        else
            this.guild = Bot.client.guilds.get(id);
    }

    /**
     * Returns the prefix that the guild uses
     *
     * @returns Prefix
     * @memberof GuildWrapper
     */
    async getPrefix() {
        await this.load('prefix');
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
        await this.update(query);
        this.data.prefix = prefix;
    }

    /**
     * returns the case log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    async getCaseChannel() {
        this.load('caseChannel');
        if (!this.caseChannel) return undefined;
        return this.guild.channels.get(this.caseChannel);
    }

    /**
     * returns the log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    async getLogChannel() {
        this.load('logChannel');
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
        await this.load('ranks');
        if (!guildRanks.includes(rank)) return undefined;
        if (this.ranks[rank].includes(snowflake)) return undefined;
        let query = { $addToSet: {} };
        query.$addToSet[`ranks.${rank}`] = [snowflake];
        await this.update(query);
        this.data.ranks[rank].push(snowflake);
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
        await this.load('ranks');
        if (!guildRanks.includes(rank)) return undefined;
        if (!this.ranks[rank].includes(snowflake)) return undefined;
        let query = { $pull: {} };
        query.$pull[`ranks.${rank}`] = snowflake;
        await this.update(query);
        this.data.ranks[rank].splice(this.ranks[rank].indexOf(snowflake), 1);
        return this.ranks[rank];
    }

    // TODO: add functions for webhooks
    // TODO: add functions for adding/removing locks

    /**
     * Always returns a object if the command exists
     *
     * @param {string} command Command to get settings of
     * @returns CommandSettings object
     * @memberof GuildWrapper
     */
    async getCommandSettings(command: string) {
        await this.load('commandSettings');
        if (!Bot.commands.get(command)) return undefined;
        return this.commandSettings[command] || {};
    }

    /**
     * Overrides settings of specified command with provided settings
     *
     * @param {string} command Command to override settings of
     * @param {CommandSettings} settings Settings to override with
     * @returns The final settings if successful
     * @memberof GuildWrapper
     */
    async setCommandSettings(command: string, settings: CommandSettings) {
        if (!Bot.commands.get(command)) return undefined;
        let query = { $set: {} };
        query.$set[`commandSettings.${command}`] = settings;
        await this.update(query);
        this.data.commandSettings[command] = settings;
        return settings;
    }

    /**
     * If command is enabled or disabled
     *
     * @param {string} command Command to check
     * @returns if command is enabled
     * @memberof GuildWrapper
     */
    async commandIsEnabled(command: string) {
        await this.load('commandSettings');
        if (!Bot.commands.get(command)) return undefined;
        if (!this.commandSettings[command] || this.commandSettings[command]._enabled) return true;
        return false;
    }

    /**
     * Toggles a command on or off
     *
     * @param {string} command Command to toggle
     * @param {boolean} [value] Optional value to override the toggling value
     * @returns The final command toggle settings
     * @memberof GuildWrapper
     */
    async toggleCommand(command: string, value?: boolean) {
        await this.load('commandSettings');
        let commandObj = Bot.commands.get(command);
        if (!commandObj || !commandObj.togglable) return undefined;

        let settings = await this.getCommandSettings(command);
        value = value || settings._enabled === false ? true : false;

        let query = { $set: {} };
        query.$set[`commandSettings.${command}._enabled`] = value;
        await this.update(query);

        settings._enabled = value;
        this.data.commandSettings[command] = settings;
        return value;
    }

    /**
     * Merges the usage limits of the guild and the global settings at the specific path.
     *
     * @param {string} [path=''] What part to merge (default everything)
     * @returns Merge usage limits
     * @memberof GuildWrapper
     */
    async getUsageLimits(path: PropertyPath = '') {
        await this.load('usageLimits');
        let globalUsageLimits: any = _.at<any>(Bot.settings.usageLimits, path) || {};
        let guildUsageLimits: any = _.at<any>(this.usageLimits, path) || {};
        return _.merge(globalUsageLimits, guildUsageLimits);
    }

    /**
     * Gets command usage limits for specified command
     *
     * @param {CommandResolvable} commandResolvable Command for which to get usage limits
     * @returns {CommandUsageLimits} Usage limits for specified command
     * @memberof GuildWrapper
     */
    async getCommandUsageLimits(commandResolvable: CommandResolvable): Promise<CommandUsageLimits> {
        let command = resolveCommand(commandResolvable);
        let usageLimits = await this.getUsageLimits(`commands.${command.name}`);
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
        await this.load('ranks');
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
    async getRankIDs(rank: GuildRank): Promise<Snowflake[]> {
        await this.load('ranks');
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
    async getRankMemberIDs(rank: GuildRank): Promise<Snowflake[]> {
        return (await this.getRankIDs(rank)).filter(id => !this.guild.roles.get(id));
    }

    /**
     * Only provides GuildMembers of a certain rank
     * 
     * @param {GuildRank} rank Rank to get GuildMembers of
     * @returns GuildMembers of a certain rank
     * @memberof GuildWrapper
     */
    async getRankMembers(rank: GuildRank) {
        let userIDs = await this.getRankMemberIDs(rank);
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
    async getRankRoleIDs(rank: GuildRank): Promise<Snowflake[]> {
        return (await this.getRankIDs(rank)).filter(id => this.guild.roles.get(id));
    }

    /**
     * Only provides Role of a certain rank
     *
     * @param {GuildRank} rank Rank to get Roles of
     * @returns Roles of a certain rank
     * @memberof GuildWrapper
     */
    async getRankRoles(rank: GuildRank) {
        return (await this.getRankRoleIDs(rank)).map(id => this.guild.roles.get(id));
    }

}