import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';

var command: commandInterface = {
    name: 'lmgtfy',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: true,
    help: {
        shortDescription: 'Let Me Google That For You link generator',
        longDescription: 'Let Me Google That For You link generator',
        usages: [
            '{command} [search term]'
        ],
        examples: [
            '{command} How do I install node?'
        ]
    },
    // TODO: implement different  search engines such as DDG for bangs and img search etc?
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            args = args.trim();
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false; // was unsuccessful
            }

            let content = "https://lmgtfy.com/?q=" + encodeURIComponent(args);

            // send lmgtfy link
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(content);
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name);
            return true; // was successful
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false; // was unsuccessful
        }
    }
};

export default command;
