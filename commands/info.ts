import { BOTMASTER, MEMBER } from "../utils/permissions";
import { bot } from "..";
import utils from "../utils";
import { Message, RichEmbed } from "discord.js";
import { command as commandInterface } from "../commands";

var command: commandInterface = { name: null, path: null, dm: null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };


command.run = async (bot: bot, message: Message, args: string, permissionLevel: number) => {
    try {
        message.channel.send({
            "embed": {
                "title": "About me:",
                "description": "Hi, my name is BulletBot! I'm a general purpose discord bot here to help you and your server. \nI originally was created to solve a webhook problem in the [Code Bullet and Co](https://discord.gg/7Z5d4HF) server. After some development time, my creator Jet extended the goal to replacing every bot in the server.",
                "color": bot.database.getGlobalSettings().defaultEmbedColor,
                "timestamp": new Date().toISOString(),
                "thumbnail": {
                    "url": bot.client.user.avatarURL
                },
                "author": {
                    "name": "BulletBot",
                    "icon_url": bot.client.user.avatarURL
                },
                "fields": [
                    {
                        "name": "My Creators:",
                        "value": "Jet#1167 (Planning/Coding)\nLucavon#2154 (Hosting)\nAster#4205 (PFP Creator)",
                        "inline": true
                    },
                    {
                        "name": "Version:",
                        "value": "Beta (unknown version)",
                        "inline": true
                    }
                ]
            }
        });
        bot.mStatistics.logCommandUsage(command.name);
    } catch (e) {
        bot.error(message, e);
    }
}

command.name = "info";
command.path = "";
command.dm = true;
command.permissionLevel = MEMBER;
command.shortHelp = "gives bot infos";
command.embedHelp = function (bot: bot) {
    return {
        "embed": {
            "color": bot.database.getGlobalSettings().helpEmbedColor,
            "author": {
                "name": "Command: " + bot.database.getPrefix() + command.name
            },
            "fields": [
                {
                    "name": "Description:",
                    "value": "gives infos about the bot"
                },
                {
                    "name": "Need to be:",
                    "value": utils.permissions.permToString(command.permissionLevel),
                    "inline": true
                },
                {
                    "name": "DM capable:",
                    "value": command.dm,
                    "inline": true
                },
                {
                    "name": "Usage:",
                    "value": "{command}".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command}".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                }
            ]
        }
    }
};

export default command;