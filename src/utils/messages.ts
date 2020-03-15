import { DMChannel, Guild, Message, Role, TextChannel } from 'discord.js';

import { Bot } from '..';
import { stringToRole } from './parsers';
import { BenchmarkTimestamp } from './time';


// TODO: probably will soon be deprecated, but move to GuildWrapper 
/**
 * Mentions any role and user in content. 
 * {{role:[role]}} will be parsed to a mention.
 *
 * @export
 * @param {Guild} guild guild where message should be send
 * @param {TextChannel} channel channel where message should be send
 * @param {string} content message content
 * @param {*} [embed] optional embed object
 * @param {Message} [editMessage] message to edit
 * @param {number} [requestTime] if call comes from a command the request timestamp should be passed
 * @param {string} [commandName] if call comes from a command the name of the command should be passed
 */
export async function sendMentionMessage(guild: Guild, channel: TextChannel, content: string, disableEveryone = false, embed?: any, editMessage?: Message, requestTime?: BenchmarkTimestamp, commandName?: string) {
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

    // makes all roles mentionable
    var changedRoles: Role[] = [];
    var managePerm = guild.me.hasPermission('MANAGE_ROLES');
    for (const obj of mentions) {
        if (typeof (obj[1]) != 'string' && !obj[1].mentionable && managePerm) {
            await obj[1].setMentionable(true, 'BulletBot mention');
            changedRoles.push(obj[1]);
        }
        content = content.replace(obj[0], obj[1].toString());
    }

    // send message
    if (requestTime) Bot.mStats.logResponseTime(commandName, requestTime);
    if (!/^\s*$/.test(content)) {
        if (embed) {
            embed.disableEveryone = disableEveryone
        } else embed = { disableEveryone: disableEveryone };
        if (editMessage) {
            if (!embed.embed) embed.embed = embed;
            await editMessage.edit(content, embed);
        } else {
            await channel.send(content, embed);
        }
    }

    // resets all mentionable properties
    for (const role of changedRoles) {
        role.setMentionable(false, 'BulletBot mention revert').catch((reason) => {
            console.error('error while reverting mentionable property:', reason);
            Bot.mStats.logError(new Error('error while reverting mentionable property:' + reason));
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
export function sendError(channel: TextChannel | DMChannel, error: any) {
    console.error(error);
    Bot.mStats.logMessageSend();
    return channel.send('Oops something went wrong. #BlameEvan');
}