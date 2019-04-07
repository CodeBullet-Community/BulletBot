import { GuildMember } from "discord.js";
import { botInterface } from "..";

export const MEMBER = 0;
export const MOD = 1;
export const ADMIN = 2;
export const BOTMASTER = 3;

/** returns permission level of member corresponding to MEMBER, MOD, ADMIN and BOTMASTER */
export async function getPermissionLevel(bot: botInterface, member: GuildMember) {
    // TODO: test this function
    if (bot.database.getBotMasters().includes(member.user.id)) {
        return BOTMASTER;
    }
    if (member.hasPermission("ADMINISTRATOR")) {
        return ADMIN;
    }

    var guildDoc = await bot.database.findGuildDoc(member.guild)
    if (!guildDoc) { 
        return MEMBER; 
    }
    guildDoc = guildDoc.toObject();

    if (guildDoc.staff.admins.users.includes(member.user.id)) {
        return ADMIN;
    }
    for (var i = 0; i < guildDoc.staff.admins.roles.length; i++){
        if(member.roles.find(role => role.id == guildDoc.staff.admins.roles[i])){
            return ADMIN;
        }
    }

    if (guildDoc.staff.mods.users.includes(member.user.id)) {
        return MOD;
    }
    for (var i = 0; i < guildDoc.staff.mods.roles.length; i++){
        if(member.roles.find(role => role.id == guildDoc.staff.mods.roles[i])){
            return MOD;
        }
    }
    return MEMBER;
}

export function permToString(permissionLevel:number){
    switch(permissionLevel){
        case MEMBER:
            return "member";
        case MOD:
            return "mod";
        case ADMIN:
            return "admin";
        case BOTMASTER:
            return "my master";
        default:
            console.warn("unknow permission level: "+permissionLevel);
            return "Unknown PermissionLevel";
    }
}
