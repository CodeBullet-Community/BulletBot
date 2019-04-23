import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { MEMBER } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';

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

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        var date = new Date();
        var age = getDayDiff(message.guild.createdTimestamp, date.getTime());
        var memberCount = message.guild.members.size;
        var embed = {
            "embed": {
                "color": Bot.database.settingsDB.cache.defaultEmbedColor,
                "timestamp": date.toISOString(),
                "footer": {
                    "text": "ID: " + message.guild.id + ' | Region: ' + message.guild.region
                },
                "thumbnail": {
                    "url": message.guild.iconURL
                },
                "author": {
                    "name": message.guild.name,
                    "icon_url": message.guild.iconURL
                },
                "fields": [
                    {
                        "name": "Owner",
                        "value": message.guild.owner.toString(),
                        "inline": true
                    },
                    {
                        "name": "Channel Categories",
                        "value": message.guild.channels.filter(x => x.type == 'category').size,
                        "inline": true
                    },
                    {
                        "name": "Text Channels",
                        "value": message.guild.channels.filter(x => x.type == 'text').size,
                        "inline": true
                    },
                    {
                        "name": "Voice Channels",
                        "value": message.guild.channels.filter(x => x.type == 'voice').size,
                        "inline": true
                    },
                    {
                        "name": "Members",
                        "value": `${memberCount}\n(${message.guild.members.filter(member => !member.user.bot).size} humans)`,
                        "inline": true
                    },
                    {
                        "name": "Bots",
                        "value": message.guild.members.filter(member => member.user.bot).size,
                        "inline": true
                    },
                    {
                        "name": "Online",
                        "value": message.guild.members.filter(member => member.presence.status == 'online').size,
                        "inline": true
                    },
                    {
                        "name": "Roles",
                        "value": message.guild.roles.size,
                        "inline": true
                    },
                    {
                        "name": "Created",
                        "value": `${formatDate(message.guild.createdAt)}\n(${age} days ago)`,
                        "inline": true
                    },
                    {
                        "name": "Super Average Join Rate",
                        "value": `${(memberCount / age).toFixed(2)} a day\n${(memberCount / age * 7).toFixed(2)} a week\n${(memberCount / age * 30).toFixed(2)} a month`,
                        "inline": true
                    }
                ]
            }
        };
        Bot.mStats.logResponseTime(command.name, requestTimestamp);
        message.channel.send(embed);
        Bot.mStats.logCommandUsage(command.name);
        Bot.mStats.logMessageSend();
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'serverinfo';
command.path = '';
command.dm = false;
command.permLevel = MEMBER;
command.togglable = false;
command.shortHelp = 'returns server infos';
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
                    'value': 'lists general server infos'
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