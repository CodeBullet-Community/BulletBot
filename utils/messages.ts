import { bot } from "..";
import { Guild, Channel, Role, GuildChannel } from "discord.js";
import { stringToRole } from "./parsers";

export async function sendMentionMessage(guild: Guild, channel: GuildChannel, content: string, embed?: any) {
    let m: RegExpExecArray;
    const roleRegex = /{{role:(\w*)}}/gm;
    var mentions: [string, Role | string][] = [];
    while ((m = roleRegex.exec(content)) !== null) {
        if (m.index === roleRegex.lastIndex) roleRegex.lastIndex++;

        var wholeMatch = m[0].toString();
        var role = stringToRole(guild, m[1].toString());
        if (role) {
            mentions.push([wholeMatch, role]);
        }
    }
    var changedRoles: Role[] = [];
    var managePerm = guild.me.hasPermission("MANAGE_ROLES");
    for (const obj of mentions) {
        if (typeof (obj[1]) != "string" && !obj[1].mentionable && managePerm) {
            await obj[1].setMentionable(true, "BulletBot mention");
            changedRoles.push(obj[1]);
        }
        content = content.replace(obj[0], obj[1].toString());
    }
    await channel.send(content, embed);
    for (const role of changedRoles) {
        role.setMentionable(false, "BulletBot mention revert").catch((reason) => {
            console.error("error while reverting mentionable property", reason);
        });
    }
}

/** send log to logChannel if defined */
export async function sendLog(bot: bot, guild: Guild, log: any) {
    var logChannel: any = await bot.database.findGuildDoc(guild.id);
    if (!logChannel) {
        console.warn("sendLog: guildDoc not found");
        return;
    }
    logChannel = logChannel.toObject().logChannel;
    if (logChannel) {
        guild.channels.get(logChannel).send(log);
    }
}