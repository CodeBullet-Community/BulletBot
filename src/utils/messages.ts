import { Guild, Role, TextChannel, DMChannel, GroupDMChannel } from 'discord.js';
import { stringToRole } from './parsers';
import { Bot } from '..';

/**
 * Mentions any role and user in content. 
 * {{role:[role]}} will be parsed to a mention.
 *
 * @export
 * @param {Guild} guild guild where message should be send
 * @param {TextChannel} channel channel where message should be send
 * @param {string} content message content
 * @param {*} [embed] optional embed object
 * @param {number} [requestTime] if call comes from a command the request timestamp should be passed
 * @param {string} [commandName] if call comes from a command the name of the command should be passed
 */
export async function sendMentionMessage(guild: Guild, channel: TextChannel, content: string, embed?: any, requestTime?: [number, number], commandName?: string) {
    var regex: RegExpExecArray;
    const roleRegex = /{{role:(.*)}}/gm;
    // [ '{{role:[role]}}' , [role object] ]
    var mentions: [string, Role | string][] = [];
    while ((regex = roleRegex.exec(content)) !== null) { // extract all {{role:[role]}} and safe the role and the actual string in array
        if (regex.index === roleRegex.lastIndex) roleRegex.lastIndex++;

        var wholeMatch = regex[0].toString();
        var role = stringToRole(guild, regex[1].toString());
        if (role) {
            mentions.push([wholeMatch, role]);
        }
    }
    var changedRoles: Role[] = [];
    var managePerm = guild.me.hasPermission('MANAGE_ROLES');
    for (const obj of mentions) { // makes all roles mentionable
        if (typeof (obj[1]) != 'string' && !obj[1].mentionable && managePerm) {
            await obj[1].setMentionable(true, 'BulletBot mention');
            changedRoles.push(obj[1]);
        }
        content = content.replace(obj[0], obj[1].toString());
    }
    if (requestTime) Bot.mStats.logResponseTime(commandName, requestTime);
    if (!/^\s*$/.test(content)) {
        await channel.send(content, embed);
    }
    for (const role of changedRoles) { // resets all mentionable properties
        role.setMentionable(false, 'BulletBot mention revert').catch((reason) => {
            console.error('error while reverting mentionable property:', reason);
            Bot.mStats.logError();
        });
    }
}

/**
 * Sends 'Oops something went wrong. #BlameEvan' into channel and prints error. It DOESN'T log it
 *
 * @export
 * @param {(TextChannel | DMChannel | GroupDMChannel)} channel channel where the error should be send
 * @param {*} error the actual error
 * @returns
 */
export function sendError(channel: TextChannel | DMChannel | GroupDMChannel, error: any) {
    console.error(error);
    Bot.mStats.logMessageSend();
    return channel.send('Oops something went wrong. #BlameEvan');
}