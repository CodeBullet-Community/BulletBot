/* The resolvers in here are based off those in the ClientDataResolver class of discord.js */

import { User, GuildMember, Message, Guild, Snowflake, GuildResolvable, UserResolvable, Channel, ChannelResolvable, RoleResolvable, Role } from "discord.js";
import { Bot } from "..";
import { CommandResolvable, commandInterface } from "../commands";
import { GuildWrapperResolvable, GuildWrapper } from "../database/wrappers/guildWrapper";

/**
 * Resolves a UserResolvable to a User object.
 * @param {UserResolvable} user The UserResolvable to identify
 * @returns {?User}
 */
export async function resolveUser(user: UserResolvable): Promise<User> {
    if (user instanceof User) return user;
    if (typeof user === 'string') return Bot.client.fetchUser(user);
    if (user instanceof GuildMember) return user.user;
    if (user instanceof Message) return user.author;
    if (user instanceof Guild) return user.owner.user;
    return null;
}

/**
 * Resolves a UserResolvable to a user ID string.
 * @param {UserResolvable} user The UserResolvable to identify
 * @returns {?Snowflake}
 */
export function resolveUserID(user: UserResolvable): Snowflake {
    if (user instanceof User || user instanceof GuildMember) return user.id;
    if (typeof user === 'string') return user || null;
    if (user instanceof Message) return user.author.id;
    if (user instanceof Guild) return user.ownerID;
    return null;
}

/**
 * Resolves a GuildResolvable to a Guild object.
 * @param {GuildResolvable} guild The GuildResolvable to identify
 * @returns {?Guild}
 */
export function resolveGuild(guild: GuildResolvable): Guild {
    if (guild instanceof Guild) return guild;
    if (typeof guild === 'string') return Bot.client.guilds.get(guild) || null;
    return null;
}

/**
 * Resolves a GuildWrapperResolvable to a GuildWrapper object.
 *
 * @export
 * @param {GuildWrapperResolvable} guild The GuildWrapperResolvable to identify
 * @returns {Promise<GuildWrapper>}
 */
export async function resolveGuildWrapper(guild: GuildWrapperResolvable): Promise<GuildWrapper> {
    if (guild instanceof GuildWrapper) return guild;
    return await Bot.database.getGuildWrapper(guild);
}

/**
 * Resolves a GuildMemberResolvable to a GuildMember object.
 * @param {GuildResolvable} guild The guild that the member is part of
 * @param {UserResolvable} user The user that is part of the guild
 * @returns {?GuildMember}
 */
export async function resolveGuildMember(guildResolvable: GuildResolvable, userResolvable: UserResolvable): Promise<GuildMember> {
    if (userResolvable instanceof GuildMember) return userResolvable;
    let guild = resolveGuild(guildResolvable);
    let user = await resolveUser(userResolvable);
    if (!guild || !user) return null;
    return guild.fetchMember(user.id) || null;
}

/**
* Resolves a RoleResolvable to a Role object.
* @param {GuildResolvable} guild The guild that this role is part of
* @param {RoleResolvable} role The role resolvable to resolve
* @returns {?Role}
*/
export function resolveRole(guild: GuildResolvable, role: RoleResolvable): Role {
    if (role instanceof Role) return role;
    let guildObj = resolveGuild(guild);
    if (!guildObj) return null;
    if (typeof role === 'string') return guildObj.roles.get(role);
    return null;
}

/**
 * Resolves a ChannelResolvable to a Channel object.
 * @param {ChannelResolvable} channel The channel resolvable to resolve
 * @returns {?Channel}
 */
export function resolveChannel(channel: ChannelResolvable): Channel {
    if (channel instanceof Channel) return channel;
    if (typeof channel === 'string') return Bot.client.channels.get(channel) || null;
    if (channel instanceof Message) return channel.channel;
    if (channel instanceof Guild) return channel.channels.get(channel.id) || null;
    return null;
}

/**
 * Resolves a ChannelResolvable to a channel ID.
 * @param {ChannelResolvable} channel The channel resolvable to resolve
 * @returns {?Snowflake}
 */
export function resolveChannelID(channel: ChannelResolvable): Snowflake {
    if (channel instanceof Channel) return channel.id;
    if (typeof channel === 'string') return channel;
    if (channel instanceof Message) return channel.channel.id;
    if (channel instanceof Guild) return channel.defaultChannel.id;
    return null;
}

/**
 * resolves a command resolvable to a command interface
 *
 * @export
 * @param {CommandResolvable} command
 * @returns {commandInterface}
 */
export function resolveCommand(command: CommandResolvable): commandInterface {
    if (typeof command === "string")
        return Bot.commands.get(command);
    return command;
}