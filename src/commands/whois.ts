import { Message, RichEmbed, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../commands';
import { MEMBER, getPermissionLevel } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString, stringToMember } from '../utils/parsers';

function getJoinRank(ID: string, guild: Guild) { // Call it with the ID of the user and the guild
    if (!guild.member(ID)) return; // It will return undefined if the ID is not valid

    let arr = guild.members.array(); // Create an array with every member
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

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: any, width: number, padding?: string) {
    padding = padding || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(padding) + n;
}

function formatDate(date: Date) {
    return `${days[date.getUTCDay()]} ${pad(date.getUTCDate(), 2)}/${pad(date.getUTCMonth() + 1, 2)}/${pad(date.getUTCFullYear(), 4)} ${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}:${pad(date.getUTCMilliseconds(), 3)}`;
}

function getDayDiff(timestamp0: number, timestamp1: number) {
    return Math.round(Math.abs(timestamp0 - timestamp1) / (1000 * 60 * 60 * 24));
}

function createMemberEmbed(member: GuildMember, permLevel: number) {
    var date = new Date();
    var roles = '';
    var roleArray = member.roles.array();
    roleArray.shift();
    for (const role of roleArray) {
        roles += role.toString() + ' ';
    }
    if (roles.length == 0) {
        roles = 'member has no roles';
    }

    var joinRank: any = getJoinRank(member.id, member.guild) + 1;
    if (joinRank == 1) {
        joinRank = 'oldest member';
    } else {
        joinRank = ordinalSuffixOf(joinRank) + ' oldest member';
    }
    return {
        "embed": {
            "description": member.toString(),
            "color": Bot.database.settingsDB.cache.defaultEmbedColor,
            "timestamp": date.toISOString(),
            "footer": {
                "text": "ID: " + member.id
            },
            "thumbnail": {
                "url": member.user.avatarURL
            },
            "author": {
                "name": `${member.user.username} ${member.nickname ? '(' + member.nickname + ')' : ''}`,
                "icon_url": member.user.avatarURL
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
                    "value": formatDate(member.joinedAt) + `\n (${getDayDiff(member.joinedTimestamp, date.getTime())} days ago)`,
                    "inline": true
                },
                {
                    "name": "Registered",
                    "value": formatDate(member.user.createdAt) + `\n (${getDayDiff(member.user.createdTimestamp, date.getTime())} days ago)`,
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
                    "name": "Roles",
                    "value": roles
                }
            ]
        }
    };
}

function sendMemberInfo(message: Message, member: GuildMember, permLevel: number, requestTimestamp: number) {
    var embed = createMemberEmbed(member, permLevel)
    Bot.mStats.logResponseTime(command.name, requestTimestamp);
    message.channel.send(embed);
    Bot.mStats.logCommandUsage(command.name, 'self');
    Bot.mStats.logMessageSend();
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        if (args.length === 0) {
            sendMemberInfo(message, message.member, permLevel, requestTimestamp);
            return;
        }

        var member = stringToMember(message.guild, args);
        if (!member) {
            message.channel.send('Couldn\'t member with name ' + args);
            Bot.mStats.logMessageSend();
            return;
        }
        sendMemberInfo(message, member, await getPermissionLevel(member), requestTimestamp);
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'whois';
command.path = '';
command.dm = false;
command.permLevel = MEMBER;
command.togglable = false;
command.shortHelp = 'gives a description of a user';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.helpEmbedColor,
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