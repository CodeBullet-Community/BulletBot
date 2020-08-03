import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { version } from 'pjson';

var command: commandInterface = {
    name: 'info',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    help: {
        shortDescription: 'Gives infos about the bot',
        longDescription: 'Gives infos about the bot',
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
            message.channel.send({
                "embed": {
                    "title": "About me:",
                    "description": "Hi, my name is BulletBot! I'm a general purpose discord bot here to help you and your server. \nI originally was created to solve a webhook problem in the [Code Bullet and Co](https://discord.gg/7Z5d4HF) server. After some development time, my main creator Codec extended the goal to replacing every bot in the server.",
                    "color": Bot.database.settingsDB.cache.embedColors.default,
                    "timestamp": new Date().toISOString(),
                    "footer": {
                        "text": "PFP from Aster#4205"
                    },
                    "thumbnail": {
                        "url": Bot.client.user.displayAvatarURL
                    },
                    "author": {
                        "name": "BulletBot",
                        "icon_url": Bot.client.user.displayAvatarURL,
                        "url": "https://github.com/CodeBullet-Community/BulletBot"
                    },
                    "fields": [
                        {
                            "name": "Github Repo:",
                            "value": "[CodeBullet-Community/BulletBot](https://github.com/CodeBullet-Community/BulletBot)",
                            "inline": true
                        },
                        {
                            "name": "Discord Server:",
                            "value": "[BulletBot](https://discord.gg/74py7yd)",
                            "inline": true
                        },
                        {
                            "name": "My Creators:",
                            "value": "Codec#1167\nBark Ranger#0985\nanAlius#7139\nMontori#4707\n2 others",
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
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;