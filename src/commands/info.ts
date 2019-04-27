import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';
import { version } from '../bot-config.json';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number,number]) => {
    try {
        Bot.mStats.logResponseTime(command.name, requestTime);
        message.channel.send({
            "embed": {
                "title": "About me:",
                "description": "Hi, my name is BulletBot! I'm a general purpose discord bot here to help you and your server. \nI originally was created to solve a webhook problem in the [Code Bullet and Co](https://discord.gg/7Z5d4HF) server. After some development time, my main creator Jet extended the goal to replacing every bot in the server.",
                "color": Bot.database.settingsDB.cache.defaultEmbedColor,
                "timestamp": new Date().toISOString(),
                "footer": {
                    "text": "PFP from Aster#4205"
                },
                "thumbnail": {
                    "url": Bot.client.user.avatarURL
                },
                "author": {
                    "name": "BulletBot",
                    "icon_url": Bot.client.user.avatarURL
                },
                "fields": [
                    {
                        "name": "My Creators:",
                        "value": "Jet#1167 (Planning/Coding)\nLucavon#2154 (Hosting)\npagwin#4132 (Coding)",
                        "inline": true
                    },
                    {
                        "name": "Version:",
                        "value": version,
                        "inline": true
                    }
                ]
            }
        });
        Bot.mStats.logCommandUsage(command.name);
        Bot.mStats.logMessageSend();
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'info';
command.path = '';
command.dm = true;
command.permLevel = permLevels.member;
command.togglable = false;
command.shortHelp = 'returns infos about bot';
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
                    'value': 'gives infos about the bot'
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
                    'value': '{command}'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command}'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;