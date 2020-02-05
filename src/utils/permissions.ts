import { GuildMember, GuildChannel, GuildMemberResolvable } from 'discord.js';
import { Bot } from '..';
import { resolveGuildMember } from './resolvers';

/**
 * constants for every existing perm level
 *
 * @export
 * @enum {number}
 */
export enum permLevels {
    member = 0,
    immune = 1,
    mod = 2,
    admin = 3,
    botMaster = 4,
}