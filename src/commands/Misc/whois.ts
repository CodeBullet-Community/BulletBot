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

/**
 * addes the suffic to numbers (like 1st, 2nd, etc.)
 *
 * @param {number} i number to add suffix to
 * @returns
 */
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
        case "dnd": return Bot.settings.embedColors.negative;
        case "idle": return Bot.settings.embedColors.warn;
        case "offline": return Bot.settings.embedColors.neutral;
        case "online": return Bot.settings.embedColors.positive;
    }
}

/**
 * returns a embed with infos about a member
 *
 * @param {GuildMember} member member to list infos of
 * @param {number} permLevel the permission level of the member
 * @param {number} requesterPermLevel the permission level of the info requester
 * @returns
 */
async function createMemberEmbed(member: GuildMember, permLevel: number, requesterPermLevel: number) {
    var date = new Date();

    // lists all role in a string (only first 40, so the field size doesn't reach the discord field size limit)
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

    // get join rank of member
    var joinRank: any = (await getJoinRank(member.id, member.guild)) + 1;
    if (joinRank == 1) {
        joinRank = 'oldest member';
    } else {
        joinRank = ordinalSuffixOf(joinRank) + ' oldest member';
    }

    // creates embed
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

    // if the requester is a mod or higher, it also adds the case counts
    if (requesterPermLevel >= permLevels.mod) {
        let caseDocs = await Bot.caseLogger.cases.find({ user: member.id, guild: member.guild.id }, ['action']).exec();
        let summary = { unmute: 0, mute: 0, unban: 0, ban: 0, kick: 0, warn: 0, softban: 0 };
        for (const caseDoc of caseDocs)
            summary[caseDoc.action]++;

        embed.embed.fields.push({
            "name": "Cases",
            "value": `Total: ${caseDocs.length} | Warn: ${summary.warn} | Mute: ${summary.mute} | Kick: ${summary.kick} | Softban: ${summary.softban} | Ban: ${summary.ban} | Unmute: ${summary.unmute} | Unban: ${summary.unban}`
        });
    }

    return embed;
}

/**
 * send the output of the createMemberEmbed function
 *
 * @param {Message} message message to reply to
 * @param {GuildMember} member member to get info of
 * @param {number} permLevel permission level of the member
 * @param {number} requesterPermLevel the permission level of the info requester
 * @param {[number, number]} requestTime when the info was requested to measure response time
 */
async function sendMemberInfo(message: Message, member: GuildMember, permLevel: number, requesterPermLevel: number, requestTime: [number, number]) {
    var embed = await createMemberEmbed(member, permLevel, requesterPermLevel)
    Bot.mStats.logResponseTime(command.name, requestTime);
    message.channel.send(embed);
    Bot.mStats.logCommandUsage(command.name, 'self');
    Bot.mStats.logMessageSend();
}

var command: commandInterface = {
    name: 'whois',
    path: '',
    dm: false,
    permLevel: permLevels.member,
    togglable: false,
    help: {
        shortDescription: 'returns infos about a user',
        longDescription: 'returns infos about a user',
        usages: [
            '{command}',
            '{command} [member]'
        ],
        examples: [
            '{command}',
            '{command} @Bullet Bot#1234'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            if (args.length === 0) { // send info of requester if no arguments provided
                await sendMemberInfo(message, message.member, permLevel, permLevel, requestTime);
                return;
            }

            // get member which to send info of
            var member = await stringToMember(message.guild, args);
            if (!member) {
                message.channel.send('Couldn\'t member with that name/id');
                Bot.mStats.logMessageSend();
                return false;
            }
            await sendMemberInfo(message, member, await getPermLevel(member), permLevel, requestTime);
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
}

export default command;