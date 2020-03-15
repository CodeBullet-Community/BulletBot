import { commandInterface } from '../commands';
import { PermLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';

var command: commandInterface = {
    name: 'ping',
    path: '',
    dm: true,
    permLevel: PermLevels.member,
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
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
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