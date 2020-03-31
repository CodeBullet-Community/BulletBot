import {
    ChannelResolvable,
    Guild,
    GuildChannelResolvable,
    GuildMemberResolvable,
    GuildResolvable,
    Snowflake,
    TextChannel,
} from 'discord.js';
import _, { PropertyPath } from 'lodash';
import { Model, Schema } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { Bot } from '../..';
import { CommandName, CommandResolvable } from '../../commands';
import { PermLevels } from '../../utils/permissions';
import { CommandUsageLimits, UsageLimits } from '../schemas/global';
import {
    BBGuild,
    CommandSettings,
    GuildDoc,
    GuildObject,
    GuildRank,
    guildRanks,
    MegalogFunction,
    megalogGroups,
    WebhookService,
} from '../schemas/main/guild';
import { DocWrapper } from './docWrapper';

export type GuildWrapperResolvable = GuildWrapper | GuildResolvable;

/**
 * Wrapper for the guild object and document so everything can easily be access through one object
 *
 * @export
 * @class GuildWrapper
 * @implements {guildObject}
 */
export class GuildWrapper extends DocWrapper<GuildObject> implements BBGuild {
    readonly guild: Guild;
    readonly id: Snowflake;
    readonly prefix?: string;
    readonly logChannel: Snowflake;
    readonly caseChannel: Snowflake;
    readonly totalCases: number;
    readonly logs: Schema.Types.ObjectId[];
    readonly modmailChannel: Snowflake;
    readonly webhooks: {
        // key is service name
        [K in WebhookService]?: Schema.Types.ObjectId[];
    };
    readonly locks: {
        // channel id
        [K in Snowflake]: {
            until?: number;
            allowOverwrites: Snowflake[];
            neutralOverwrites: Snowflake[];
        };
    };
    readonly usageLimits?: UsageLimits;
    readonly ranks: {
        admins: Snowflake[]; // role and user ids
        mods: Snowflake[]; // role and user ids
        immune: Snowflake[]; // role and user ids
    };
    readonly commandSettings: {
        // key is command name
        [K in CommandName]: CommandSettings
    };
    readonly megalog: {
        ignoreChannels: Snowflake[];
    } & { [T in MegalogFunction]: Snowflake };
    private readonly bot: Bot;

    /**
     * Creates an instance of GuildWrapper.
     * 
     * @param {Snowflake} id ID of the guild
     * @param {Guild} [guild] optional guild object (so constructor doesn't have to search for it)
     * @memberof GuildWrapper
     */
    constructor(model: Model<GuildDoc>, bot: Bot, guild: Guild) {
        super(model, { id: guild.id }, { id: guild.id }, keys<GuildObject>());

        this.bot = this.bot;
        this.guild = guild;
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
        return this.bot.settings.prefix;
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
        let tempData = this.cloneData();
        tempData.prefix = prefix;
        this.data.next(tempData);
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
        return this.guild.channels.cache.get(this.caseChannel);
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
        return this.guild.channels.cache.get(this.logChannel);
    }

    /**
     * returns promise with specified case document
     *
     * @param {number} caseID case ID of case to be returned
     * @returns
     * @memberof GuildWrapper
     */
    getCase(caseID: number) {
        return this.bot.caseLogger.findByCase(this.id, caseID);
    }

    /**
     * deletes the specified case from the database
     *
     * @param {number} caseID case that should be deleted
     * @returns
     * @memberof GuildWrapper
     */
    removeCase(caseID: number) {
        return this.bot.caseLogger.deleteCase(this.id, caseID);
    }

    /**
     * returns a promise with an array of all cases
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCases() {
        return this.bot.caseLogger.findByGuild(this.id);
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
        let tempData = this.cloneData();
        tempData.ranks[rank].push(snowflake);
        this.data.next(tempData);
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
        let tempData = this.cloneData();
        tempData.ranks[rank].splice(this.ranks[rank].indexOf(snowflake), 1);
        this.data.next(tempData);
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
    async getCommandSettings(command: CommandName) {
        await this.load('commandSettings');
        if (!this.bot.commands.get(command)) return undefined;
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
    async setCommandSettings(command: CommandName, settings: CommandSettings) {
        if (!this.bot.commands.get(command)) return undefined;
        let query = { $set: {} };
        query.$set[`commandSettings.${command}`] = settings;
        await this.update(query);
        let tempData = this.cloneData();
        tempData.commandSettings[command] = settings;
        this.data.next(tempData);
        return settings;
    }

    /**
     * If command is enabled or disabled
     *
     * @param {string} command Command to check
     * @returns if command is enabled
     * @memberof GuildWrapper
     */
    async commandIsEnabled(command: CommandName) {
        await this.load('commandSettings');
        if (!this.bot.commands.get(command)) return undefined;
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
    async toggleCommand(command: CommandName, value?: boolean) {
        await this.load('commandSettings');
        let commandObj = this.bot.commands.get(command);
        if (!commandObj || !commandObj.togglable) return undefined;

        let settings = await this.getCommandSettings(command);
        value = value || settings._enabled === false ? true : false;

        let query = { $set: {} };
        query.$set[`commandSettings.${command}._enabled`] = value;
        await this.update(query);

        settings._enabled = value;
        let tempData = this.cloneData();
        tempData.commandSettings[command] = settings;
        this.data.next(tempData);
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
        let globalUsageLimits: any = _.at<any>(this.bot.settings.usageLimits, path) || {};
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
        let command = this.bot.commands.resolve(commandResolvable);
        let usageLimits = await this.getUsageLimits(`commands.${command.name}`);
        return this.bot.commands.getCommandUsageLimits(command, usageLimits);
    }

    /**
     *  returns perm level of member
     *  - member: 0
     *  - immune: 1
     *  - mod: 2
     *  - admin: 3 
     *  - this.botMaster: 4
     *
     * @export
     * @param {GuildMemberResolvable} member member to get perm level from
     * @returns perm level
     */
    async getPermLevel(memberResolvable: GuildMemberResolvable): Promise<PermLevels> {
        await this.load('ranks');
        let member = await this.guild.members.resolve(memberResolvable);

        // if bot master
        if ((await this.bot.settings.botMasters).includes(member.id))
            return PermLevels.botMaster;

        // if admin
        if (member.hasPermission('ADMINISTRATOR'))
            return PermLevels.admin;

        if (this.ranks.admins.includes(member.id)
            || member.roles.cache.find(role => this.ranks.admins.includes(role.id)))
            return PermLevels.admin;
        if (this.ranks.mods.includes(member.id)
            || member.roles.cache.find(role => this.ranks.mods.includes(role.id)))
            return PermLevels.mod;
        if (this.ranks.immune.includes(member.id)
            || member.roles.cache.find(role => this.ranks.immune.includes(role.id)))
            return PermLevels.immune;
        return PermLevels.member;
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
        return (await this.getRankIDs(rank)).filter(id => !this.guild.roles.cache.get(id));
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
        let users = userIDs.map(id => this.guild.members.fetch(id))
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
        return (await this.getRankIDs(rank)).filter(id => this.guild.roles.cache.get(id));
    }

    /**
     * Only provides Role of a certain rank
     *
     * @param {GuildRank} rank Rank to get Roles of
     * @returns Roles of a certain rank
     * @memberof GuildWrapper
     */
    async getRankRoles(rank: GuildRank) {
        return (await this.getRankRoleIDs(rank)).map(id => this.guild.roles.cache.get(id));
    }

    /**
     * Check if a megalog function is enabled
     *
     * @param {MegalogFunction} func Which megalog function to check
     * @returns
     * @memberof GuildWrapper
     */
    async megalogIsEnabled(func: MegalogFunction) {
        return await this.getMegalogChannelID(func) ? true : false;
    }

    /**
     * Returns the id of the channel for a specific megalog function if it's defined
     *
     * @param {MegalogFunction} func Function to get channel for
     * @returns
     * @memberof GuildWrapper
     */
    async getMegalogChannelID(func: MegalogFunction) {
        this.load('megalog');
        if (!megalogGroups.all.includes(func))
            throw new Error(`Invalid Input. 'func' should be a MegalogFunction but was: ${func}`);
        return this.megalog[func];
    }

    /**
     * Returns the channel for a specific megalog channel if it's defined
     *
     * @param {MegalogFunction} func
     * @returns
     * @memberof GuildWrapper
     */
    async getMegalogChannel(func: MegalogFunction) {
        let channelID = await this.getMegalogChannelID(func);
        let channel = this.guild.channels.cache.get(channelID);
        if (!(channel instanceof TextChannel)) return undefined;
        return channel;
    }

    /**
     * Sets a channel for a specific megalog function
     *
     * @param {MegalogFunction} func Function to set the channel for
     * @param {ChannelResolvable} channel Channel to set the function to
     * @returns The channel id if it was set successfully
     * @memberof GuildWrapper
     */
    async setMegalogChannel(func: MegalogFunction, channel: ChannelResolvable) {
        this.load('megalog');
        let channelID = this.bot.client.channels.resolveID(channel);
        if (await this.getMegalogChannelID(func) == channelID) return undefined;
        let query = { $set: {} };
        query.$set[`megalog.${func}`] = channelID;
        await this.update(query);
        let tempData = this.cloneData();
        tempData.megalog[func] = channelID;
        this.data.next(tempData);
        return channelID;
    }

    /**
     * Unsets the channel of a specific megalog function
     *
     * @param {MegalogFunction} func Function to unset the channel
     * @returns The old channel id if there was one
     * @memberof GuildWrapper
     */
    async disableMegalogFunction(func: MegalogFunction) {
        this.load('megalog');
        let channelId = await this.getMegalogChannelID(func);
        if (!channelId) return undefined;
        let query = { $unset: {} };
        query.$unset[`megalog.${func}`] = 0;
        await this.update(query);
        let tempData = this.cloneData();
        delete tempData.megalog[func];
        this.data.next(tempData);
        return channelId;
    }

    /**
     * Gets the ids of the channels that the megalog should ignore
     *
     * @returns
     * @memberof GuildWrapper
     */
    async getMegalogIgnoreChannelIDs() {
        await this.load('megalog');
        return this.megalog.ignoreChannels;
    }

    /**
     * Gets the channels that the megalog should ignore
     *
     * @returns {Promise<TextChannel[]>}
     * @memberof GuildWrapper
     */
    async getMegalogIgnoreChannels(): Promise<TextChannel[]> {
        let IDs = await this.getMegalogIgnoreChannelIDs();
        let channels = IDs.map(id => this.guild.channels.cache.get(id));
        // @ts-ignore
        return channels.filter(channel => channel instanceof TextChannel);
    }

    /**
     * Checks if a channel should be ignored by the megalog
     *
     * @param {GuildChannelResolvable} channel Channel to check
     * @returns If the channel should be ignored by the megalog
     * @memberof GuildWrapper
     */
    async megalogIsIgnored(channel: GuildChannelResolvable) {
        this.load('megalog');
        let channelID = this.guild.channels.resolveID(channel);
        return this.megalog.ignoreChannels.includes(channelID);
    }

    /**
     * Removes a channel from the megalog ignore list if the channel is in that list
     *
     * @param {GuildChannelResolvable} channel Channel to remove
     * @returns Resulting ignore list if channel was removed
     * @memberof GuildWrapper
     */
    async removeMegalogIgnoreChannel(channel: GuildChannelResolvable) {
        this.load('megalog');
        let channelID = this.guild.channels.resolveID(channel);
        if (!this.megalog.ignoreChannels.includes(channelID)) return undefined;
        let query = { $pull: {} };
        query.$pull['megalog.ignoreChannels'] = channelID;
        await this.update(query);
        let tempData = this.cloneData();
        _.remove(tempData.megalog.ignoreChannels, channelID);
        this.data.next(tempData);
        return this.megalog.ignoreChannels;
    }

    /**
     * Adds a channel to the megalog ignore list if it doesn't already exist
     *
     * @param {GuildChannelResolvable} channel Channel to add
     * @returns Resulting ignore list if channel was added
     * @memberof GuildWrapper
     */
    async addMegalogIgnoreChannel(channel: GuildChannelResolvable) {
        this.load('megalog');
        let channelObj = this.guild.channels.resolve(channel);
        if (!(channelObj instanceof TextChannel)) return undefined;
        if (this.megalog.ignoreChannels.includes(channelObj.id)) return undefined;
        let query = { $addToSet: {} };
        query.$addToSet['megalog.ignoreChannels'] = channelObj.id;
        await this.update(query);
        let tempData = this.cloneData();
        tempData.megalog.ignoreChannels.push(channelObj.id);
        this.data.next(tempData);
        return this.megalog.ignoreChannels;
    }

}