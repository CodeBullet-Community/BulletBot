import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { CommandName, CommandResolvable, Commands } from '../../../commands';
import { BBGuildMember, GuildMemberDoc, GuildMemberObject } from '../../schemas/main/guildMember';
import { DocWrapper } from '../docWrapper';
import { GuildWrapper } from './guildWrapper';
import { UserWrapper } from './userWrapper';
import { Snowflake } from 'discord.js';

/**
 * Wrapper for the GuildMemberObject and document so everything can easily be access through one object
 *
 * @export
 * @class GuildMemberWrapper
 * @extends {DocWrapper<GuildMemberObject>}
 * @implements {BBGuildMember}
 */
export class GuildMemberWrapper extends DocWrapper<GuildMemberObject> implements BBGuildMember {

    readonly id: Snowflake;
    readonly user: UserWrapper;
    readonly guild: GuildWrapper;
    readonly commandLastUsed: {
        readonly [Command in CommandName]?: number;
    };

    private readonly commandModule: Commands;

    /**
     * Creates an instance of GuildMemberWrapper.
     * 
     * @param {Model<GuildMemberDoc>} model Model of the guildMembers collection
     * @param {UserWrapper} user User which is a member 
     * @param {GuildWrapper} guild Guild which member is in
     * @param {Commands} commandModule
     * @memberof GuildMemberWrapper
     */
    constructor(model: Model<GuildMemberDoc>, user: UserWrapper, guild: GuildWrapper, commandModule: Commands) {
        let initialData = { user: user.id, guild: guild.id };
        super(model, initialData, initialData, keys<GuildMemberObject>());

        this.id = this.user.id;
        this.user = user;
        this.guild = guild;
        this.commandModule = commandModule;
    }

    /**
     * When the member last used a command in the guild
     *
     * @param {CommandResolvable} command Command to check
     * @returns Timestamp
     * @memberof GuildMemberWrapper
     */
    async getCommandLastUsed(command: CommandResolvable) {
        await this.load('commandLastUsed');
        let commandName = this.commandModule.resolveName(command);
        if (!this.commandLastUsed?.[commandName])
            return 0;
        return this.commandLastUsed[commandName];
    }

    /**
     * Set when the member last used a command in the guild
     *
     * @param {CommandResolvable} command Command to set timestamp
     * @param {number} timestamp Timestamp when command was last used
     * @memberof GuildMemberWrapper
     */
    async setCommandLastUsed(command: CommandResolvable, timestamp: number) {
        await this.load('commandLastUsed');
        let commandName = this.commandModule.resolveName(command);

        await this.updatePathSet([[`commandLastUsed.${commandName}`, timestamp]]);
        await this.user.setCommandLastUsed('global', command, timestamp);
    }

    /**
     * If member can use the command based on the guilds usageLimits and the users command usage
     *
     * @param {CommandResolvable} command Command to check
     * @returns
     * @memberof GuildMemberWrapper
     */
    async canUseCommand(command: CommandResolvable) {
        await this.guild.load('usageLimits');
        let usageLimits = this.guild.usageLimits.getCommandUsageLimits(command);
        if (!usageLimits.enabled) return false;

        if (await this.getCommandLastUsed(command) + usageLimits.localCooldown > Date.now())
            return false;

        let globalLastUsed = await this.user.getCommandLastUsed('global', command);
        if (globalLastUsed + usageLimits.globalCooldown > Date.now())
            return false;

        return true;
    }

}