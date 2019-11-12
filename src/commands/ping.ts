import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';

var command: commandInterface = {
    name: 'ping',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    help: {
        shortDescription: 'checks bots responsiveness',
        longDescription: 'let\'s you see if bot is responsive',
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
};

export default command;