import { GuildMember, GuildChannel } from 'discord.js';
import { Bot } from '..';
import { staffObject } from '../database/schemas';

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

/**
 *  returns perm level of member
 *  - member: 0
 *  - immune: 1
 *  - mod: 2
 *  - admin: 3 
 *  - botMaster: 4
 *
 * @export
 * @param {GuildMember} member member to get perm level from
 * @returns perm level
 */
export async function getPermLevel(member: GuildMember) {
    if (member == null) {
        return permLevels.member;
    }
    if (Bot.settings.getBotMasters().includes(member.user.id)) { // bot masters
        return permLevels.botMaster;
    }
    if (member.hasPermission('ADMINISTRATOR')) { // if a user has admin rights he's automatically a admin
        return permLevels.admin;
    }

    // get staff doc
    var staffDoc = await Bot.database.findStaffDoc(member.guild.id);
    if (!staffDoc) {
        return permLevels.member;
    }
    var staffObject: staffObject = staffDoc.toObject();

    // check if member is admin
    if (staffObject.admins.users.includes(member.user.id)) {
        return permLevels.admin;
    }
    for (var i = 0; i < staffObject.admins.roles.length; i++) {
        if (member.roles.find(role => role.id == staffObject.admins.roles[i])) {
            return permLevels.admin;
        }
    }

    // check if member is mod or higher
    if (staffObject.mods.users.includes(member.user.id)) {
        return permLevels.mod;
    }
    for (var i = 0; i < staffObject.mods.roles.length; i++) {
        if (member.roles.find(role => role.id == staffObject.mods.roles[i])) {
            return permLevels.mod;
        }
    }

    // check if member is immune
    if (staffObject.immune.users.includes(member.user.id)) {
        return permLevels.immune;
    }
    for (var i = 0; i < staffObject.immune.roles.length; i++) {
        if (member.roles.find(role => role.id == staffObject.immune.roles[i])) {
            return permLevels.immune;
        }
    }
    return permLevels.member;
}