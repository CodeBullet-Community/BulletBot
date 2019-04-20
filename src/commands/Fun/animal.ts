import { Message, RichEmbed, Guild } from "discord.js";
import { commandInterface } from "../../commands";
import { Bot } from "../..";
import { sendError } from "../../utils/messages";
import { permToString } from "../../utils/parsers";
import { MEMBER } from "../../utils/permissions";
import { get } from "snekfetch";

function selectRandom(array: any[]) {
    return array[Math.floor(Math.random() * Math.floor(array.length))];
}

async function sendRandomImage(message: Message, API: string, requestTimestamp: number) {
    var res: any = await get(API);
    var setname = message.author.username;
    if (message.member.nickname != null) {
        setname = message.member.nickname;
    }
    var embed = new RichEmbed();
    embed.setAuthor("requested by: " + setname + " (" + message.author.tag + ")", message.author.avatarURL);
    embed.setImage(res.body.link);
    embed.setColor(Bot.database.settingsDB.cache.defaultEmbedColor);
    Bot.mStats.logResponseTime(command.name, requestTimestamp);
    message.channel.send(embed);
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            return;
        }
        args = args.toLowerCase();

        var apis = Bot.database.settingsDB.cache.commands[command.name].apis;
        var animals = Object.keys(apis);
        if (args == "random") {
            await sendRandomImage(message, apis[selectRandom(animals)], requestTimestamp);
            Bot.mStats.logCommandUsage(command.name, "random");
        } else {
            if (animals.includes(args)) {
                await sendRandomImage(message, apis[args], requestTimestamp);
                Bot.mStats.logCommandUsage(command.name, args);
            } else {
                message.channel.send(`\`${args}\` isn't a animal or isn't yet supported.`)
            }
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = "animal";
command.path = "";
command.dm = true;
command.permLevel = MEMBER;
command.togglable = true;
command.shortHelp = "returns cute animal images";
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        "embed": {
            "color": Bot.database.settingsDB.cache.helpEmbedColor,
            "author": {
                "name": "Command: " + prefix + command.name
            },
            "fields": [
                {
                    "name": "Description:",
                    "value": "Gets image of specified animal."
                },
                {
                    "name": "Valid animals:",
                    "value": "cat, dog, fox, panda, red-panda, bird, pikachu"
                },
                {
                    "name": "Need to be:",
                    "value": permToString(command.permLevel),
                    "inline": true
                },
                {
                    "name": "DM capable:",
                    "value": command.dm,
                    "inline": true
                },
                {
                    "name": "Togglable:",
                    "value": command.togglable,
                    "inline": true
                },
                {
                    "name": "Usage:",
                    "value": "{command} [animal]\n{command} random".replace(/\{command\}/g, prefix + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command} bird\n{command} random".replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;