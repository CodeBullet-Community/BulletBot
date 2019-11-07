import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';
import { getDurationDiff, timeFormat, durations, getDistributedDuration } from '../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
    try {
        Bot.mStats.logResponseTime(command.name, requestTime);
        const m: any = await message.channel.send("Pong");
        let uptime = getDistributedDuration(Bot.client.uptime);
        m.edit({
            "embed": {
                "color": Bot.database.settingsDB.cache.embedColors.default,
                "timestamp": new Date().toISOString(),
                "author": {
                    "name": "BulletBot Status",
                    "icon_url": Bot.client.user.displayAvatarURL
                },
                "fields": [
                    {
                        "name": "Ping:",
                        "value": `\`${m.createdTimestamp - message.createdTimestamp}ms\``,
                        "inline": true
                    },
                    {
                        "name": "Client API:",
                        "value": `\`${Bot.client.ping}ms\``,
                        "inline": true
                    },
                    {
                        "name": "MongoDB Cluster:",
                        "value": `\`${await Bot.database.ping()}ms\``,
                        "inline": true
                    },
                    {
                        "name": "Errors Total:",
                        "value": await Bot.mStats.errors.countDocuments().exec(),
                        "inline": true
                    },
                    {
                        "name": "Errors Current Hour:",
                        "value": Bot.mStats.hourly.doc.toObject().errorsTotal,
                        "inline": true
                    },
                    {
                        "name": "Online Since:",
                        "value": dateFormat(Bot.client.readyAt, timeFormat) + `\n(${uptime.days}d ${uptime.hours}h ${uptime.minutes}m)`,
                        "inline": true
                    }
                ]
            }
        });
        Bot.mStats.logCommandUsage(command.name);
        Bot.mStats.logMessageSend();
        return true;
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'status';
command.path = '';
command.dm = true;
command.permLevel = permLevels.botMaster;
command.togglable = false;
command.shortHelp = 'gives bot status';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.embedColors.help,
            'author': {
                'name': 'Command: ' + prefix + command.name
            },
            'fields': [
                {
                    'name': 'Description:',
                    'value': 'gives status of different parts of the bot'
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