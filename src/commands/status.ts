import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';
import { getDurationDiff, timeFormat, durations, getDistributedDuration } from '../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'status',
    path: '',
    dm: true,
    permLevel: permLevels.botMaster,
    togglable: false,
    help: {
        shortDescription: 'Gives bot status',
        longDescription: 'Gives status of different parts of the bot',
        usages: [
            '{command}'
        ],
        examples: [
            '{command}'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
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
};

export default command;