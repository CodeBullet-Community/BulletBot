import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
    try {
        Bot.mStats.logResponseTime(command.name, requestTime);
        const m: any = await message.channel.send('Ping?');
        m.edit(`Pong! \`${m.createdTimestamp - message.createdTimestamp}ms\``);
        Bot.mStats.logMessageSend();
        Bot.mStats.logCommandUsage(command.name);
        return true;
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'ping';
command.path = '';
command.dm = true;
command.permLevel = permLevels.member;
command.togglable = false;
command.shortHelp = 'check bots responsiveness';
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
                    'value': 'let\'s you see if bot is responsive'
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