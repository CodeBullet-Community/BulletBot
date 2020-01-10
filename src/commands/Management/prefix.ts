import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';

var command: commandInterface = {
    name: 'prefix',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'sets custom prefix',
        longDescription: 'let\'s you set a custom prefix or reset it to the default one.\n`?!prefix` will always list the prefix, even if a custom prefix was set.',
        usages: [
            '{command}',
            '{command} [custom prefix]',
            '{command} reset'
        ],
        examples: [
            '{command}',
            '{command} ?',
            '{command} reset'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, guildWrapper, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // if no argument was provided reply with prefix
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`My prefix is \`${guildWrapper.getPrefix()}\``);
                Bot.mStats.logCommandUsage(command.name, 'list');
                Bot.mStats.logMessageSend();
                return false;
            }

            if (args == 'reset' || args == Bot.settings.prefix) { // if user wants to reset the prefix to default
                if (guildWrapper.prefix) { // if a custom prefix is currently set
                    guildWrapper.setPrefix();

                    // send confirmation message
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`Successfully reset the prefix to \`${Bot.settings.prefix}\``);
                    // log that prefix has been changed
                    Bot.logger.logPrefix(message.guild, message.member, oldPrefix, Bot.settings.prefix);
                } else {
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`This server doesn't have a custom prefix`);
                }
                Bot.mStats.logCommandUsage(command.name, 'reset');
                Bot.mStats.logMessageSend();
                return;
            }

            // if prefix is longer than 10 characters
            if (args.length > 10) {
                message.channel.send('The custom prefix shouldn\'t be longer then 10 characters.');
                Bot.mStats.logMessageSend();
                return false;
            }
            var oldPrefix = guildWrapper.getPrefix();
            guildWrapper.setPrefix(args);

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`Successfully set the prefix to \`${args}\``);
            Bot.mStats.logCommandUsage(command.name, 'set');
            Bot.mStats.logMessageSend();
            // log that prefix has been changed
            Bot.logger.logPrefix(message.guild, message.member, oldPrefix, args);
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;