import { Guild } from "discord.js";

//actually doesn't get used, it's just as a note
const REGEX = {
    user: {
        id: /<@(\d*)>/g,
        name: /([^#@:]{2,32})#\d{4}/g
    },
    role: /<@&(\d*)>/g,
    channel: /<#(\d*)>/g,
    embed: /(\r\n|\n|\r|\t| {2,})/gm
}

/** parses a string into a GuildMember object */
export function stringToUser(guild: Guild, text: string) {

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

    if (/<@&(\d*)>/g.test(text)) {
        var result = /<@&(\d*)>/g.exec(text);
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
    if (/<#(\d*)>/g.test(text)) {
        var result = /<#(\d*)>/g.exec(text);
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
