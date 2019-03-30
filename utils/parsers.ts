import { Guild, User, GuildMember } from "discord.js";

const REGEX = {
    user: {
        id: /<@(\d*)>/g,
        name: /([^#@:]{2,32})#\d{4}/g
    },
    role: /<@&(\d*)>/g,
    channel: /<#(\d*)>/g,
    embed: /(\r\n|\n|\r|\t| {2,})/gm
}

namespace utils.parsers {
    /** parses a string into a GuildMember object */
    export function stringToUser(guild: Guild, text: string) {

        if (REGEX.user.id.test(text)) {
            var result = REGEX.user.id.exec(text);
            if (result != null) {
                text = result[1];
            }
        }
        if (REGEX.user.name.test(text)) {
            var result = REGEX.user.name.exec(text);
            if (result != null) {
                text = result[1];
            }
        }
        if (isNaN(Number(text))) {
            //search by name
            return guild.members.find(x => x.user.username === text);
        } else {
            //search by ID
            return guild.members.get(text);
        }
    }
    /** parses a string into a Role object or a String for "everyone" or "here" */
    export function stringToRole(guild: Guild, text: string) {

        if (text == "here" || text == "@here") {
            return "@here";
        }
        if (text == "everyone" || text == "@everyone") {
            return "@everyone";
        }

        if (REGEX.role.test(text)) {
            var result = REGEX.role.exec(text);
            if (result != null) {
                text = result[1];
            }
        }
        if (isNaN(Number(text))) {
            //search by name
            return guild.roles.find(x => x.name === text);
        } else {
            //search by ID
            return guild.roles.find(x => x.id === text);
        }
    }
    /** parses a string into a Channel object */
    export function stringToChannel(guild: Guild, text: string) {
        if (REGEX.channel.test(text)) {
            var result = REGEX.channel.exec(text);
            if (result != null) {
                text = result[1];
            }
        }
        if (isNaN(Number(text))) {
            //search by name
            return guild.channels.find(x => x.name === text);
        } else {
            //search by ID
            return guild.channels.find(x => x.id === text);
        }
    }
    /** parses a string into a JSON object for Embed */
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
}