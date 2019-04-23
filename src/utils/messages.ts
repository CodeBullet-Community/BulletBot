import { Guild, Role, TextChannel, DMChannel, GroupDMChannel } from 'discord.js';
import { stringToRole } from './parsers';
import { Bot } from '..';

/**
 * Mentions any role and user in content. 
 * {{role:[role]}} will be parsed to a mention.
 *
 * @export
 * @param {Guild} guild
 * @param {TextChannel} channel
 * @param {string} content message content
 * @param {*} [embed] optional embed object
 */
export async function sendMentionMessage(guild: Guild, channel: TextChannel, content: string, embed?: any, requestTimestamp?: number, commandName?: string) {
    var regex: RegExpExecArray;
    const roleRegex = /{{role:(\w*)}}/gm;
    var mentions: [string, Role | string][] = [];
    while ((regex = roleRegex.exec(content)) !== null) {
        if (regex.index === roleRegex.lastIndex) roleRegex.lastIndex++;

        var wholeMatch = regex[0].toString();
        var role = stringToRole(guild, regex[1].toString());
        if (role) {
            mentions.push([wholeMatch, role]);
        }
    }
    var changedRoles: Role[] = [];
    var managePerm = guild.me.hasPermission('MANAGE_ROLES');
    for (const obj of mentions) {
        if (typeof (obj[1]) != 'string' && !obj[1].mentionable && managePerm) {
            await obj[1].setMentionable(true, 'BulletBot mention');
            changedRoles.push(obj[1]);
        }
        content = content.replace(obj[0], obj[1].toString());
    }
    if (requestTimestamp) Bot.mStats.logResponseTime(commandName, requestTimestamp);
    await channel.send(content, embed);
    for (const role of changedRoles) {
        role.setMentionable(false, 'BulletBot mention revert').catch((reason) => {
            console.error('error while reverting mentionable property:', reason);
            Bot.mStats.logError();
        });
    }
}

export function sendError(channel: TextChannel | DMChannel | GroupDMChannel, error: any) {
    console.error(error);
    Bot.mStats.logMessageSend();
    return channel.send('Oops something went wrong. #BlameEvan');
}