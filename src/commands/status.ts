import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { MEMBER, BOTMASTER } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        Bot.mStats.logResponseTime(command.name, requestTimestamp);
        const m: any = await message.channel.send("Pong");
        m.edit({
            "embed": {
                "color": Bot.database.settingsDB.cache.defaultEmbedColor,
                "timestamp": new Date().toISOString(),
                "author": {
                    "name": "BulletBot Status",
                    "icon_url": Bot.client.user.avatarURL
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
                        "name": "Errors Current Hour:",
                        "value": Bot.mStats.hourly.doc.toObject().errorsTotal,
                        "inline": true
                    }
                ]
            }
        });
        Bot.mStats.logCommandUsage(command.name);
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'status';
command.path = '';
command.dm = true;
command.permLevel = BOTMASTER;
command.togglable = false;
command.shortHelp = 'gives bot status';
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