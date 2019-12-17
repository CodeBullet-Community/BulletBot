import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';
import { durations, getDurationDiff } from '../../utils/time';

var command: commandInterface = {
    name: 'bug',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    cooldownGlobal: durations.second * 20,
    help: {
        shortDescription: 'reports a bug to the devs',
        longDescription: 'reports a bug to the dev. Be as descriptive as you can',
        usages: [
            '{command} [bug]'
        ],
        examples: [
            '{command} This feature doesn\'t work with that'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            // log bug
            await Bot.mStats.logBug(message, args);

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send('Bug was logged. Thanks for reporting it.');
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name);
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;