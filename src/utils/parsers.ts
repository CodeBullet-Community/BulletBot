import { Guild } from 'discord.js';
import { filterAction, FILTER_ACTION } from './filters';
import { MEMBER, IMMUNE, MOD, ADMIN, BOTMASTER } from './permissions';
import { Bot } from '..';

/*
const REGEX = {
    user: {
        id: /<@(\d*)>/g,
        name: /([^#@:]{2,32})#\d{4}/g
    },
    role: /<@&(\d*)>/g,
    channel: /<#(\d*)>/g,
    embed: /(\r\n|\n|\r|\t| {2,})/gm
}
*/

/**
 * returns similarity value based on Levenshtein distance
 *
 * @param {string} s1
 * @param {string} s2
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
 * Can parse following inputs:
 * - user mention
 * - username
 * - user id
 *
 * @export
 * @param {Guild} guild
 * @param {string} text
 * @returns
 */
export function stringToMember(guild: Guild, text: string) {
    if (/<@(\d*)>/g.test(text)) {
        var result = /<@(\d*)>/g.exec(text);
        if (result != null) {
            text = result[1];
        }
    }
    if (/([^#@:]{2,32})#\d{4}/g.test(text)) {
        var result = /([^#@:]{2,32})#\d{4}/g.exec(text);
        if (result != null) {
            text = result[1];
        }
    }
    // by id
    var member = guild.members.get(text);
    if (!member) {
        // by username
        member = guild.members.find(x => x.user.username == text);
    }
    if (!member) {
        // by nickname
        member = guild.members.find(x => x.nickname == text);
    }
    if (!member) {
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
 * Parses a string into a Role object or a String for 'everyone' or 'here'.
 * Can parse following input:
 * - here / everyone name
 * - @here / @everyone mention
 * - role name
 * - role mention
 * - role id
 *
 * @export
 * @param {Guild} guild
 * @param {string} text
 * @returns
 */
export function stringToRole(guild: Guild, text: string) {

    if (text == 'here' || text == '@here') {
        return '@here';
    }
    if (text == 'everyone' || text == '@everyone') {
        return '@everyone';
    }

    if (/<@&(\d*)>/g.test(text)) {
        var result = /<@&(\d*)>/g.exec(text);
        if (result != null) {
            text = result[1];
        }
    }
    // by id
    var role = guild.roles.get(text);
    if (!role) {
        // by name
        role = guild.roles.find(x => x.name == text);
    }
    if (!role) {
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
 * - channel name
 *
 * @export
 * @param {Guild} guild
 * @param {string} text
 * @returns
 */
export function stringToChannel(guild: Guild, text: string) {
    if (!guild) return null;
    if (/<#(\d*)>/g.test(text)) {
        var result = /<#(\d*)>/g.exec(text);
        if (result != null) {
            text = result[1];
        }
    }
    // by id
    var channel = guild.channels.get(text);
    if (!channel) {
        // by name
        channel = guild.channels.find(x => x.name == text);
    }
    if (!channel) {
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
 * @param {string} text
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
 * converts filter action into words
 *
 * @export
 * @param {filterAction} action
 * @returns
 */
export function actionToString(action: filterAction) {
    switch (action.type) {
        case FILTER_ACTION.NOTHING:
            return 'nothing';
        case FILTER_ACTION.DELETE:
            if (action.delay == 0) {
                return 'deleted message';
            }
            return `deleted message after ${action.delay}ms`;
        case FILTER_ACTION.SEND:

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
 * @param {number} permissionLevel
 * @returns
 */
export function permToString(permissionLevel: number) {
    switch (permissionLevel) {
        case MEMBER:
            return 'member';
        case IMMUNE:
            return 'immune member';
        case MOD:
            return 'mod';
        case ADMIN:
            return 'admin';
        case BOTMASTER:
            return 'my master';
        default:
            Bot.mStats.logError();
            console.warn('unknown permission level: ' + permissionLevel);
            return 'Unknown PermissionLevel';
    }
}