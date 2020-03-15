import { Bot } from '../..';
import { commandInterface } from '../../commands';
import { sendError } from '../../utils/messages';
import { PermLevels } from '../../utils/permissions';
import { Durations } from '../../utils/time';

const abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
const waitTime = Durations.second * 10;

var command: commandInterface = {
    name: 'abc',
    path: '',
    dm: true,
    permLevel: PermLevels.member,
    togglable: true,
    help: {
        shortDescription: 'Does the abc with you',
        longDescription: 'This command will make the bot follow the abc with you',
        usages: [
            '{command}'
        ],
        examples: [
            '{command}'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime, commandCache?) => {
        try {
            Bot.mStats.logResponseTime(command.name, requestTime);
            Bot.mStats.logCommandUsage(command.name);
            if (!commandCache) {
                // when command is first called
                message.channel.send('Ok let\'s do the alphabet. I start:');
                Bot.mStats.logMessageSend();
                message.channel.send(abc[0]);
                Bot.mStats.logMessageSend();
                // create CommandCache for user
                Bot.database.createCommandCache(message.channel, message.author, command, permLevel, Date.now() + waitTime, 0);
            } else {
                await commandCache.load('cache');
                if (abc[commandCache.cache + 1] == args.toLocaleLowerCase()) { // if user replied with the correct character
                    await commandCache.setCache(commandCache.cache + 2);

                    if (abc[commandCache.cache]) { // if alphabet is finished or not
                        message.channel.send(abc[commandCache.cache]);
                        Bot.mStats.logMessageSend();
                        await commandCache.extendExpirationTimestamp(waitTime)
                    } else {
                        message.channel.send('alphabet was finished');
                        Bot.mStats.logMessageSend();
                        commandCache.remove();
                    }
                } else {
                    message.channel.send(`You were supposed to send \`${abc[commandCache.cache + 1]}\``);
                    Bot.mStats.logMessageSend();
                    commandCache.remove();
                }
            }
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;