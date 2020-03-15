import { commandInterface } from '../commands';
import { PermLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { timeFormat, getDistributedDuration } from '../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'status',
    path: '',
    dm: true,
    permLevel: PermLevels.botMaster,
    togglable: false,
    help: {
        shortDescription: 'gives bot status',
        longDescription: 'gives status of different parts of the bot',
        usages: [
            '{command}'
        ],
        examples: [
            '{command}'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            Bot.mStats.logResponseTime(command.name, requestTime);
            const m: any = await message.channel.send("Pong");
            let uptime = getDistributedDuration(Bot.client.uptime);
            m.edit({
                "embed": {
                    "color": Bot.settings.embedColors.default,
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