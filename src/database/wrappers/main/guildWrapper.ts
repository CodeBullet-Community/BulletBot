import {
    ChannelResolvable,
    Client,
    Collection,
    Guild,
    GuildChannel,
    GuildChannelResolvable,
    GuildMemberResolvable,
    Snowflake,
    TextChannel,
} from 'discord.js';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { CommandName, CommandResolvable, Commands } from '../../../commands';
import { PermLevels } from '../../../utils/permissions';
import { UsageLimits } from '../../schemas/global';
import {
    BBGuild,
    CommandSettings,
    GuildDoc,
    GuildObject,
    GuildRank,
    guildRanks,
    MegalogFunction,
    megalogGroups,
} from '../../schemas/main/guild';
import { DocWrapper } from '../docWrapper';
import { SettingsWrapper } from '../settings/settingsWrapper';

/**
 * Wrapper for the guild object and document so everything can easily be access through one object
 *
 * @export
 * @class GuildWrapper
 * @implements {guildObject}
 */
export class GuildWrapper extends DocWrapper<GuildObject> implements BBGuild {

    /**
     * Discord.js Guild object of the guild
     *
     * @type {Guild}
     * @memberof GuildWrapper
     */
    readonly guild: Guild;
    readonly id: Snowflake;
    readonly prefix?: string;
    private _logChannel?: TextChannel;
    readonly logChannel?: TextChannel;
    private _caseChannel?: TextChannel;
    readonly caseChannel?: TextChannel;
    readonly totalCases: number;
    readonly cases: unknown; // TODO: implement CaseLogger
    readonly logs: unknown; // TODO: implement LogLogger
    readonly youtubeWebhooks: unknown; // TODO: implement GuildYoutubeWebhookManager
    private _locks: Collection<string, unknown>; // TODO: add Collection of LockChannelWrappers
    readonly locks: Collection<string, unknown>;
    private _usageLimits?: UsageLimits;
    readonly usageLimits?: UsageLimits;
    readonly ranks: {
        readonly [Rank in GuildRank]: Snowflake[];
    };
    readonly commandSettings: {
        [K in CommandName]: CommandSettings
    };
    private _megalog: {
        ignoreChannels: TextChannel[];
    } & { [T in MegalogFunction]: TextChannel };
    readonly megalog: {
        readonly ignoreChannels: TextChannel[];
    } & { readonly [T in MegalogFunction]?: TextChannel };

    private readonly client: Client;
    private readonly settings: SettingsWrapper;
    private readonly commandModule: Commands;

    /**
     * Creates an instance of GuildWrapper.
     * 
     * @param {Model<GuildDoc>} model Model of guild collection
     * @param {Guild} guild Discord.js Guild object
     * @param {Client} client
     * @param {SettingsWrapper} settings
     * @param {Commands} commandModule
     * @memberof GuildWrapper
     */
    constructor(model: Model<GuildDoc>, guild: Guild, client: Client, settings: SettingsWrapper, commandModule: Commands) {
        super(model, { id: guild.id }, { id: guild.id }, keys<GuildObject>());
        this.guild = guild;
        this.client = client;
        this.settings = settings;
        this.commandModule = commandModule;

        this.setDataGetters(['logChannel', 'caseChannel', 'locks', 'usageLimits', 'megalog']);

        this.subToMappedProperty('logChannel').subscribe(
            id => this._logChannel = <TextChannel>this.guild.channels.cache.get(id));
        this.subToMappedProperty('caseChannel').subscribe(
            id => this._caseChannel = <TextChannel>this.guild.channels.cache.get(id));
        // TODO: create hook for _locks
        // TODO: create hook for _usageLimits

        // creating hooks for megalog property
        let megalog = this.subToMappedProperty('megalog');
        this.subToMappedProperty('ignoreChannels', megalog)
            .subscribe((ids: Snowflake[]) => {
                this._megalog.ignoreChannels = [];
                ids.forEach(id => {
                    let channel = this.guild.channels.cache.get(id);
                    if (!this.checkMegalogChannel(channel, 'ignoreChannels'))
                        return;
                    this._megalog.ignoreChannels.push(channel);
                });
            });
        for (const func of megalogGroups.all)
            this.subToMappedProperty(func, megalog).subscribe(id => {
                let channel = this.guild.channels.cache.get(id);
                if (!this.checkMegalogChannel(channel, func))
                    return;
                this._megalog[func] = channel;
            });
        /* This would only add and remove the channels that changed and should be more efficient. 
        The problem is that it does not preserve the order
    
        let ignoreChannels = this.subToMappedProperty('ignoreChannels', megalog)
            .pipe(pairwise());
        ignoreChannels.pipe(map(([prev, curr]) => _.difference<Snowflake>(prev, curr)))
            .subscribe(removed => _.remove(this._megalog.ignoreChannels,
                channel => removed.includes(channel.id)));
        ignoreChannels.pipe(map(([prev, curr]) => _.difference<Snowflake>(curr, prev)))
            .subscribe(added => added.forEach(
                id => {
                    let channel = this.guild.channels.cache.get(id);
                    if (!(channel instanceof TextChannel)) {
                        console.warn(`Megalog channel "${id}" of guild "${this.guild.id}" is of wrong type. ` +
                            `Expected TextChannel but is "${channel.type}"`);
                        return;
                    }
                    this._megalog.ignoreChannels.push(channel);
                })); */

        this.setIfLoadedProperty('logChannel', () => this._logChannel);
        this.setIfLoadedProperty('caseChannel', () => this._caseChannel);
        this.setIfLoadedProperty('locks', () => this._locks);
        this.setIfLoadedProperty('usageLimits', () => this._usageLimits);
        this.setIfLoadedProperty('megalog', () => this._megalog);
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
        return this.settings.prefix;
    }

    /**
     * Sets a new prefix for the server
     *
     * @param {string} prefix New prefix (If not provided, prefix will be reset)
     * @memberof GuildWrapper
     */
    async setPrefix(prefix?: string) {
        if (!prefix)
            return this.updatePathUnset('prefix');
        await this.updatePathSet([['prefix', prefix]]);
    }

    /**
     * Sets the channel where LogLogger will send logs
     *
     * @param {GuildChannelResolvable} channel Channel to set it to
     * @memberof GuildWrapper
     */
    async setLogChannel(channel: GuildChannelResolvable) {
        let channelID = this.guild.channels.resolveID(channel);
        await this.updatePathSet([['logChannel', channelID]]);
    }

    /**
     * Sets the channel where CaseLogger will send logs
     *
     * @param {GuildChannelResolvable} channel Channel to set it to
     * @memberof GuildWrapper
     */
    async setCaseChannel(channel: GuildChannelResolvable) {
        let channelID = this.guild.channels.resolveID(channel);
        await this.updatePathSet([['caseChannel', channelID]]);
    }

    // TODO: implement channel lock functions

    /**
     * Checks if rank is a valid GuildRank and if not throws an error
     *
     * @private
     * @param {GuildRank} rank Rank to check
     * @memberof GuildWrapper
     */
    private checkGuildRank(rank: GuildRank) {
        if (!guildRanks.includes(rank))
            throw new Error(`Invalid Input. Expected GuildRank got "${rank}"`);
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
        this.checkGuildRank(rank);
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
     * Adds user/role to admin/mod/immune rank. 
     * If id already is in rank, it will just return undefined.
     *
     * @param {GuildRank} rank Which rank the user/role should be added to
     * @param {Snowflake} snowflake Role/User id to add to the rank
     * @returns Resulting list of IDs in the rank
     * @memberof GuildWrapper
     */
    async addToRank(rank: GuildRank, snowflake: Snowflake) {
        await this.load('ranks');
        this.checkGuildRank(rank);
        if (this.data.value.ranks[rank].includes(snowflake))
            return undefined;
        await this.updatePathAddToSet([[`ranks.${rank}`, snowflake]])
        return this.ranks[rank];
    }

    /**
     * Removes user/role from the admin/mod/immune rank.
     * If id is not in rank, it will just return undefined.
     *
     * @param {GuildRank} rank Rank the user should be removed from
     * @param {Snowflake} snowflake Role/User id to remove to the rank
     * @returns Resulting list of IDs in the rank
     * @memberof GuildWrapper
     */
    async removeFromRank(rank: GuildRank, snowflake: Snowflake) {
        await this.load('ranks');
        this.checkGuildRank(rank);
        if (!this.data.value.ranks[rank].includes(snowflake))
            return undefined;
        await this.updatePathPull([[`ranks.${rank}`, snowflake]]);
        return this.ranks[rank];
    }

    /**
     *  Returns perm level of member
     *  - member: 0
     *  - immune: 1
     *  - mod: 2
     *  - admin: 3 
     *  - botMaster: 4
     *
     * @export
     * @param {GuildMemberResolvable} member Member to get perm level from
     * @returns
     */
    async getPermLevel(memberResolvable: GuildMemberResolvable) {
        await this.load('ranks');
        let member = await this.guild.members.resolve(memberResolvable);

        if ((await this.settings.botMasters).includes(member.id))
            return PermLevels.botMaster;
        // TODO: use function from SettingsWrapper to check if user is bot master

        if (member.hasPermission('ADMINISTRATOR'))
            return PermLevels.admin;

        for (const rank of guildRanks)
            if (this.data.value.ranks[rank].includes(member.id)
                || member.roles.cache.find(role => this.data.value.ranks[rank].includes(role.id)))
                return PermLevels[rank];

        return PermLevels.member;
    }

    /**
     * Check if command exists and if not throw an error
     *
     * @private
     * @param {CommandResolvable} command Command to check
     * @returns
     * @memberof GuildWrapper
     */
    private checkCommand(command: CommandResolvable) {
        let commandObj = this.commandModule.resolve(command);
        if (commandObj == null)
            throw new Error(`Invalid command name. Provided command name is not a command "${command}"`);
        return commandObj;
    }

    /**
     * Always returns a object if the command exists
     *
     * @param {CommandResolvable} command Command to get settings of
     * @returns CommandSettings object
     * @memberof GuildWrapper
     */
    async getCommandSettings(command: CommandResolvable) {
        await this.load('commandSettings');
        let commandName = this.checkCommand(command).name;
        return this.commandSettings[commandName] || {};
    }

    /**
     * Overrides settings of specified command with provided settings
     *
     * @param {CommandResolvable} command Command to override settings of
     * @param {CommandSettings} settings Settings to override with
     * @returns The final settings if successful
     * @memberof GuildWrapper
     */
    async setCommandSettings(command: CommandResolvable, settings: CommandSettings) {
        let commandName = this.checkCommand(command).name;
        await this.updatePathSet([[`commandSettings.${commandName}`, settings]]);
        return settings;
    }

    /**
     * If command is enabled or disabled
     *
     * @param {CommandResolvable} command Command to check
     * @returns if command is enabled
     * @memberof GuildWrapper
     */
    async commandIsEnabled(command: CommandResolvable) {
        await this.load('commandSettings');
        let commandName = this.checkCommand(command).name;
        if (!this.commandSettings[commandName] || this.commandSettings[commandName]._enabled)
            return true;
        return false;
    }

    /**
     * Toggles a command on or off
     *
     * @param {CommandResolvable} command Command to toggle
     * @param {boolean} [value] Optional value to override the toggling value
     * @returns The final command toggle settings
     * @memberof GuildWrapper
     */
    async toggleCommand(command: CommandResolvable, value?: boolean) {
        await this.load('commandSettings');
        let commandObj = this.checkCommand(command);
        if (!commandObj.togglable)
            throw new Error(`Specified command "${command}" cannot be toggled`);


        if (value === undefined) {
            let settings = await this.getCommandSettings(command);
            value = settings._enabled === false ? true : false;
        }

        await this.updatePathSet([
            [`commandSettings.${commandObj.name}._enabled`, value]
        ]);

        return value;
    }

    /**
     * Check if megalog function exists and if not throw an error
     *
     * @private
     * @param {string} func
     * @returns {MegalogFunction}
     * @memberof GuildWrapper
     */
    private checkMegalogFunction(func: string): MegalogFunction {
        if (!megalogGroups.all.includes(<MegalogFunction>func))
            throw new Error(`Invalid Input. 'func' should be a MegalogFunction but was: ${func}`);
        return <MegalogFunction>func;
    }

    /**
     * Check if provided channel is a TextChannel and if not log a warn
     *
     * @private
     * @param {GuildChannel} channel Channel to check
     * @param {string} key Key of this.megalog. to know on what property it occurs
     * @returns {channel is TextChannel}
     * @memberof GuildWrapper
     */
    private checkMegalogChannel(channel: GuildChannel, key: string): channel is TextChannel {
        if (!(channel instanceof TextChannel)) {
            console.warn(`Megalog channel "megalog.${key}" of guild "${this.guild.id}" is of wrong type. ` +
                `Expected TextChannel but is "${channel.type}"`);
            return false;
        }
        return true;
    }

    /**
     * Check if a megalog function is enabled
     *
     * @param {MegalogFunction} func Which megalog function to check
     * @returns
     * @memberof GuildWrapper
     */
    async megalogIsEnabled(func: MegalogFunction) {
        this.load('megalog');
        this.checkMegalogFunction(func);
        return this.megalog[func]?.id ? true : false;
    }

    /**
     * Sets a channel for a specific megalog function
     *
     * @param {MegalogFunction} func Function to set the channel for
     * @param {ChannelResolvable} channel Channel to set the function to
     * @returns The channel if it was not set before
     * @memberof GuildWrapper
     */
    async setMegalogChannel(func: MegalogFunction, channel: ChannelResolvable) {
        this.load('megalog');
        let channelObj = this.client.channels.resolve(channel);
        if (!(channelObj instanceof TextChannel))
            throw new Error(`Invalid channel type. Expected TextChannel but got "${channelObj.type}"`);
        this.checkMegalogFunction(func);
        if (this.megalog[func]?.id === channelObj.id) return undefined;
        await this.updatePathSet([[`megalog.${func}`, channelObj.id]]);
        return channelObj;
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
        this.checkMegalogFunction(func);
        let channelId = this.megalog[func]?.id;
        if (!channelId) return undefined;
        await this.updatePathUnset(`megalog.${func}`);
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
        return this.megalog.ignoreChannels.map(channel => channel.id);
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
        return this.data.value.megalog.ignoreChannels.includes(channelID);
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
        if (!this.data.value.megalog.ignoreChannels.includes(channelID))
            return undefined;
        await this.updatePathPull([['megalog.ignoreChannels', channelID]]);
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
        let channelID = this.guild.channels.resolveID(channel);
        if (this.data.value.megalog.ignoreChannels.includes(channelID))
            return undefined;
        await this.updatePathAddToSet([['megalog.ignoreChannels', channelID]]);
        return this.megalog.ignoreChannels;
    }

}