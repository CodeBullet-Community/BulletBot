import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { PermLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { CommandCache } from '../../database/commandCache';

const abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

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
                // create command cache for user
                Bot.database.createCommandCache(message.channel, message.author, command, Date.now() + 10000, { index: 0 });
            } else {
                if (abc[commandCache.cache.index + 1] == args.toLocaleLowerCase()) { // if user replied with the correct character
                    commandCache.cache.index += 2;

                    if (abc[commandCache.cache.index]) { // if alphabet is finished or not
                        message.channel.send(abc[commandCache.cache.index]);
                        Bot.mStats.logMessageSend();
                        commandCache.save(10000);
                    } else {
                        message.channel.send('alphabet was finished');
                        Bot.mStats.logMessageSend();
                        commandCache.remove();
                    }
                } else {
                    message.channel.send(`You were supposed to send \`${abc[commandCache.cache.index + 1]}\``);
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