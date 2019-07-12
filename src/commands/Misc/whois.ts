import { Message, RichEmbed, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToMember } from '../../utils/parsers';
import { getDayDiff, timeFormat } from '../../utils/time';
import dateFormat = require('dateformat');

async function getJoinRank(ID: string, guild: Guild) { // Call it with the ID of the user and the guild
    if (!guild.member(ID)) return; // It will return undefined if the ID is not valid

    let arr = (await guild.fetchMembers()).members.array(); // Create an array with every member
    arr.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp); // Sort them by join date

    for (let i = 0; i < arr.length; i++) { // Loop though every element
        if (arr[i].id == ID) return i; // When you find the user, return it's position
    }
}

function ordinalSuffixOf(i: number) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

function getPresenceColor(member: GuildMember) {
    switch (member.user.presence.status) {
        case "dnd": return Bot.database.settingsDB.cache.embedColors.negative;
        case "idle": return Bot.database.settingsDB.cache.embedColors.warn;
        case "offline": return Bot.database.settingsDB.cache.embedColors.neutral;
        case "online": return Bot.database.settingsDB.cache.embedColors.positive;
    }
}

async function createMemberEmbed(member: GuildMember, permLevel: number) {
    var date = new Date();
    var roles = '';
    var roleArray = member.roles.array();
    var roleCount = member.roles.array().length - 1;
    roleArray.shift();
    for (const role of roleArray.slice(0, 40)) {
        roles += role.toString() + ' ';
    }
    if (roleArray.length > 40) roles += `and ${roleCount - 40} more`;
    if (roles.length == 0) {
        roles = 'member has no roles';
    }

    var joinRank: any = (await getJoinRank(member.id, member.guild)) + 1;
    if (joinRank == 1) {
        joinRank = 'oldest member';
    } else {
        joinRank = ordinalSuffixOf(joinRank) + ' oldest member';
    }
    let embed: any = {
        "embed": {
            "description": member.toString(),
            "color": getPresenceColor(member),
            "timestamp": date.toISOString(),
            "footer": {
                "text": "ID: " + member.id
            },
            "thumbnail": {
                "url": member.user.displayAvatarURL
            },
            "author": {
                "name": `${member.user.username} ${member.nickname ? '(' + member.nickname + ')' : ''}`,
                "icon_url": member.user.displayAvatarURL
            },
            "fields": [
                {
                    "name": "Status",
                    "value": member.user.presence.status,
                    "inline": true
                },
                {
                    "name": "Join Rank",
                    "value": joinRank,
                    "inline": true
                },
                {
                    "name": "Joined",
                    "value": dateFormat(member.joinedAt, timeFormat) + `\n (${getDayDiff(member.joinedTimestamp, date.getTime())} days ago)`,
                    "inline": true
                },
                {
                    "name": "Registered",
                    "value": dateFormat(member.user.createdAt, timeFormat) + `\n (${getDayDiff(member.user.createdTimestamp, date.getTime())} days ago)`,
                    "inline": true
                },
                {
                    "name": "Join-Register Diff",
                    "value": getDayDiff(member.joinedTimestamp, member.user.createdTimestamp) + ' days',
                    "inline": true
                },
                {
                    "name": "Title",
                    "value": permToString(permLevel),
                    "inline": true
                },
                {
                    "name": `Roles [${roleCount}]`,
                    "value": roles
                }
            ]
        }
    };
    if (permLevel >= permLevels.mod) {
        let caseDocs = await Bot.caseLogger.cases.find({ user: member.id, guild: member.guild.id }, ['action']).exec();
        let summary = { unmute: 0, mute: 0, unban: 0, ban: 0, kick: 0, warn: 0, softban: 0 };
        for (const caseDoc of caseDocs)
            summary[caseDoc.action]++;

        embed.embed.fields.push({
            "name": "Cases",
            "value": `Total: ${caseDocs.length} | Warn: ${summary.warn} | Mute: ${summary.mute} | Kick: ${summary.warn} | Softban: ${summary.softban} | Ban: ${summary.ban} | Unmute: ${summary.unmute} | Unban: ${summary.unban}`
        });
    }
    return embed;
}

async function sendMemberInfo(message: Message, member: GuildMember, permLevel: number, requestTime: [number, number]) {
    var embed = await createMemberEmbed(member, permLevel)
    Bot.mStats.logResponseTime(command.name, requestTime);
    message.channel.send(embed);
    Bot.mStats.logCommandUsage(command.name, 'self');
    Bot.mStats.logMessageSend();
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
    try {
        if (args.length === 0) {
            await sendMemberInfo(message, message.member, permLevel, requestTime);
            return;
        }

        var member = await stringToMember(message.guild, args);
        if (!member) {
            message.channel.send('Couldn\'t member with that name/id');
            Bot.mStats.logMessageSend();
            return false;
        }
        await sendMemberInfo(message, member, await getPermLevel(member), requestTime);
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'whois';
command.path = '';
command.dm = false;
command.permLevel = permLevels.member;
command.togglable = false;
command.shortHelp = 'gives a description of a user';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.embedColors.help,
            'author': {
                'name': 'Command: ' + prefix + command.name
            },
            'fields': [
                {
                    'name': 'Description:',
                    'value': 'gives a description of a user'
                },
                {
                    'name': 'Need to be:',
                    'value': permToString(command.permLevel),
                    'inline': true
                },
                {
                    'name': 'DM capable:',
                    'value': command.dm,
                    'inline': true
                },
                {
                    'name': 'Togglable:',
                    'value': command.togglable,
                    'inline': true
                },
                {
                    'name': 'Usage:',
                    'value': `${prefix + command.name}\n${prefix + command.name} [member]`
                },
                {
                    'name': 'Example:',
                    'value': `${prefix + command.name}\n${prefix + command.name} @Bullet Bot#1234`
                }
            ]
        }
    }
};

export default command;