import { Guild } from "discord.js";
import { filterAction, FILTER_ACTION_NOTHING, FILTER_ACTION_DELETE, FILTER_ACTION_SEND } from "./filters";
import { MEMBER, IMMUNE, MOD, ADMIN, BOTMASTER } from "./permissions";
import { Bot } from "..";

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
    if (isNaN(Number(text))) {
        //search by name
        return guild.members.find(x => x.user.username == text);
    } else {
        //search by ID
        return guild.members.get(text);
    }
}

/**
 * Parses a string into a Role object or a String for "everyone" or "here".
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

    if (text == "here" || text == "@here") {
        return "@here";
    }
    if (text == "everyone" || text == "@everyone") {
        return "@everyone";
    }

    if (/<@&(\d*)>/g.test(text)) {
        var result = /<@&(\d*)>/g.exec(text);
        if (result != null) {
            text = result[1];
        }
    }
    if (isNaN(Number(text))) {
        //search by name
        return guild.roles.find(x => x.name == text);
    } else {
        //search by ID
        return guild.roles.get(text);
    }
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
    if (isNaN(Number(text))) {
        //search by name
        return guild.channels.find(x => x.name == text);
    } else {
        //search by ID
        return guild.channels.get(text);
    }
}

/**
 * Parses a string into a JSON object for Embed. 
 * Removes all unneeded spaces.
 *
 * @export
 * @param {string} text
 * @returns
 */
export function stringToEmbed(text: string) {
    var embed: JSON = null;
    try {
        text = text.replace(/(\r\n|\n|\r|\t| {2,})/gm, "");
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
        case FILTER_ACTION_NOTHING:
            return "nothing";
        case FILTER_ACTION_DELETE:
            if (action.delay == 0) {
                return "deleted message";
            }
            return `deleted message after ${action.delay}ms`;
        case FILTER_ACTION_SEND:

            return `replied with "${action.message}" to message`;
        default:
            // error will already be logged in executeAction()
            console.warn("actionToString: unknown action");
            return "unknown action";
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
            return "member";
        case IMMUNE:
            return "immune member";
        case MOD:
            return "mod";
        case ADMIN:
            return "admin";
        case BOTMASTER:
            return "my master";
        default:
            Bot.mStats.logError();
            console.warn("unknown permission level: " + permissionLevel);
            return "Unknown PermissionLevel";
    }
}