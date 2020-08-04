import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';
import { durations, getDurationDiff } from '../../utils/time';

var command: commandInterface = {
    name: 'botsuggest',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    cooldownGlobal: durations.second * 20,
    help: {
        shortDescription: 'Make suggestion for bot',
        longDescription: 'Make a suggestion for the bot. Be as descriptive as you can.',
        usages: [
            '{command} [suggestion]'
        ],
        examples: [
            '{command} Add a command that converts Fahrenheit to Celcius and vise versa'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            // log suggestion
            Bot.mStats.logBotSuggestion(message, args);

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send('Suggestion was logged. Thanks for making one.');
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name);
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;
