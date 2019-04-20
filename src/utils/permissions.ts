import { GuildMember, GuildChannel } from "discord.js";
import { Bot } from "..";
import { staffObject } from "../database/schemas";

export const MEMBER = 0;
export const IMMUNE = 1;
export const MOD = 2;
export const ADMIN = 3;
export const BOTMASTER = 4;

/**  */
/**
 *  returns permission level of member
 *  - MEMBER: 0
 *  - IMMUNE: 1
 *  - MOD: 2
 *  - ADMIN: 3 
 *  - BOTMASTER: 4
 *
 * @export
 * @param {GuildMember} member
 * @returns
 */
export async function getPermissionLevel(member: GuildMember) {
    if (member == null) {
        return MEMBER;
    }
    if (Bot.database.getBotMasters().includes(member.user.id)) {
        return BOTMASTER;
    }
    if (member.hasPermission("ADMINISTRATOR")) {
        return ADMIN;
    }

    var staffDoc = await Bot.database.findStaffDoc(member.guild.id);
    if (!staffDoc) {
        return MEMBER;
    }
    var staffObject: staffObject = staffDoc.toObject();

    if (staffObject.admins.users.includes(member.user.id)) {
        return ADMIN;
    }
    for (var i = 0; i < staffObject.admins.roles.length; i++) {
        if (member.roles.find(role => role.id == staffObject.admins.roles[i])) {
            return ADMIN;
        }
    }

    if (staffObject.mods.users.includes(member.user.id)) {
        return MOD;
    }
    for (var i = 0; i < staffObject.mods.roles.length; i++) {
        if (member.roles.find(role => role.id == staffObject.mods.roles[i])) {
            return MOD;
        }
    }
    return MEMBER;
}