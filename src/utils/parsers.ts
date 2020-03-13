import { Guild } from 'discord.js';
import { filterAction, filterActions } from './filters';
import { permLevels } from './permissions';
import { Bot } from '..';
import { durations } from './time';

/**
 * Returns similarity value based on Levenshtein distance.
 * The value is between 0 and 1
 *
 * @param {string} s1 first string
 * @param {string} s2 second string
 * @returns
 */
function stringSimilarity(s1: string, s2: string) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toString());
}

function extractString(str: string, regex: RegExp) {
    let result = regex.exec(str);
    if (result?.length < 2) return undefined;
    return result[1];
}

/**
 * helper function for stringSimilarity
 *
 * @param {*} s1
 * @param {*} s2
 * @returns
 */
function editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

/**
 * Parses string into GuildMember object.
 * If the username isn't accurate the function will use the stringSimilarity method.
 * Can parse following inputs:
 * - user mention
 * - username
 * - nickname
 * - user id
 * - similar username
 *
 * @export
 * @param {Guild} guild guild where the member is in
 * @param {string} text string to parse
 * @param {boolean} [byUsername=true] if it should also search by username (default true)
 * @param {boolean} [byNickname=true] if it should also search by nickname (default true)
 * @param {boolean} [bySimilar=true] if it should also search by similar username (default true)
 * @returns
 */
export async function stringToMember(guild: Guild, text: string, byUsername = true, byNickname = true, bySimilar: boolean = true) {
    text = extractString(text, /<@!?(\d*)>/) || extractString(text, /([^#@:]{2,32})#\d{4}/) || text;
    guild = await guild.fetchMembers()

    // by id
    var member = guild.members.get(text);
    if (!member && byUsername)
        // by username
        member = guild.members.find(x => x.user.username == text);
    if (!member && byNickname)
        // by nickname
        member = guild.members.find(x => x.nickname == text);

    if (!member && bySimilar) {
        // closest matching username
        member = guild.members.reduce(function (prev, curr) {
            return (stringSimilarity(curr.user.username, text) > stringSimilarity(prev.user.username, text) ? curr : prev);
        });
        if (stringSimilarity(member.user.username, text) < 0.4) {
            member = undefined;
        }
    }
    return member;
}

/**
 * Extracts the id from a string and the fetches the User
 *
 * @export
 * @param {string} text Text to extract id from
 * @returns User
 */
export function stringToUser(text: string) {
    text = extractString(text, /<@!?(\d*)>/) || text;
    return Bot.client.fetchUser(text);
}

/**
 * Parses a string into a Role object or a String for 'everyone' or 'here'.
 * If the role name isn't accurate the function will use the stringSimilarity method.
 * Can parse following input:
 * - here / everyone name
 * - @here / @everyone mention
 * - role name
 * - role mention
 * - role id
 * - similar role name
 *
 * @export
 * @param {Guild} guild guild where the role is in
 * @param {string} text string to parse
 * @param {boolean} [byName=true] if it should also search by name (default true)
 * @param {boolean} [bySimilar=true] if it should also search by similar name (default true)
 * @returns
 */
export function stringToRole(guild: Guild, text: string, byName = true, bySimilar = true) {

    if (text == 'here' || text == '@here') {
        return '@here';
    }
    if (text == 'everyone' || text == '@everyone') {
        return '@everyone';
    }

    text = extractString(text, /<@&(\d*)>/) || text;

    // by id
    var role = guild.roles.get(text);
    if (!role && byName) {
        // by name
        role = guild.roles.find(x => x.name == text);
    }
    if (!role && bySimilar) {
        // closest matching name
        role = guild.roles.reduce(function (prev, curr) {
            return (stringSimilarity(curr.name, text) > stringSimilarity(prev.name, text) ? curr : prev);
        });
        if (stringSimilarity(role.name, text) < 0.4) {
            role = undefined;
        }
    }
    return role;
}

/**
 * Parses a string into a Channel object.
 * Can parse following input:
 * - channel mention
 * - channel id
 * - channel name
 * - similar channel name
 *
 * @export
 * @param {Guild} guild guild where channel is in
 * @param {string} text string to parse
 * @returns
 */
export function stringToChannel(guild: Guild, text: string, byName = true, bySimilar = true) {
    if (!guild) return null;
    text = extractString(text, /<#(\d*)>/) || text;

    let channel = guild.channels.get(text);
    if (!channel && byName) channel = guild.channels.find(x => x.name == text);
    if (!channel && bySimilar) {
        // closest matching name
        channel = guild.channels.reduce(function (prev, curr) {
            return (stringSimilarity(curr.name, text) > stringSimilarity(prev.name, text) ? curr : prev);
        });
        if (stringSimilarity(channel.name, text) < 0.4) {
            channel = undefined;
        }
    }
    return channel;
}

/**
 * Parses a string into a JSON object for Embed.
 *
 * @export
 * @param {string} text string to parse
 * @returns
 */
export function stringToEmbed(text: string) {
    var embed: JSON = null;
    try {
        //text = text.replace(/(\r\n|\n|\r|\t| {2,})/gm, '');
        embed = JSON.parse(text);
    } catch (e) {
        return null;
    }
    return embed
}

/**
 * Converts filter action into words. This function creates partial sentences about what the bot did.
 *
 * @export
 * @param {filterAction} action action to stringify
 * @returns
 */
export function actionToString(action: filterAction) {
    switch (action.type) {
        case filterActions.nothing:
            return 'nothing';
        case filterActions.delete:
            if (action.delay == 0) {
                return 'deleted message';
            }
            return `deleted message after ${action.delay}ms`;
        case filterActions.send:

            return `replied with '${action.message}' to message`;
        default:
            // error will already be logged in executeAction()
            console.warn('actionToString: unknown action');
            return 'unknown action';
    }
}

/**
 * stringifies permission level
 * - 0: member
 * - 1: immune member
 * - 2: mod
 * - 3: admin
 * - 4: my master
 *
 * @export
 * @param {number} permLevel permLevel to stringify
 * @returns
 */
export function permToString(permLevel: number) {
    switch (permLevel) {
        case permLevels.member:
            return 'member';
        case permLevels.immune:
            return 'immune member';
        case permLevels.mod:
            return 'mod';
        case permLevels.admin:
            return 'admin';
        case permLevels.botMaster:
            return 'my master';
        default:
            Bot.mStats.logError(new Error('unknown permission level: ' + permLevel));
            console.warn('unknown permission level: ' + permLevel);
            return 'Unknown PermissionLevel';
    }
}

/**
 * converts milliseconds into a string. Examples:
 * - 3m 4s
 * - 20d 30m
 * - 0s
 * - 1d 1h 1m 1s
 *
 * @export
 * @param {number} duration duration in milliseconds
 * @returns
 */
export function durationToString(duration: number) {

    var ms = duration % 1000;
    duration = (duration - ms) / 1000;
    var seconds = duration % 60;
    duration = (duration - seconds) / 60;
    var minutes = duration % 60;
    duration = (duration - minutes) / 60;
    var hours = duration % 24;
    var days = (duration - hours) / 24;

    var durationString = '';

    if (days != 0) durationString += days + 'd ';
    if (hours != 0) durationString += hours + 'h ';
    if (minutes != 0) durationString += minutes + 'm ';
    if (seconds != 0) durationString += seconds + 's';

    if (durationString == '') durationString = '0s';

    return durationString.trim();
}

/**
 * converts string into milliseconds. Syntax:
 * - Ns = N seconds
 * - Nm = N minutes
 * - Nh = N hours
 * - Nd = N days
 *
 * @export
 * @param {string} text input text
 * @returns
 */
export function stringToDuration(text: string) {
    let ms = 0;
    let seconds = /(\d+)s/.exec(text);
    if (seconds) ms += Number(seconds[1]) * durations.second;
    let minutes = /(\d+)m/.exec(text);
    if (minutes) ms += Number(minutes[1]) * durations.minute;
    let hours = /(\d+)h/.exec(text);
    if (hours) ms += Number(hours[1]) * durations.hour;
    let days = /(\d+)d/.exec(text);
    if (days) ms += Number(days[1]) * durations.day;

    return ms;
}