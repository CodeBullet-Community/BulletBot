import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';

var command: commandInterface = {
    name: 'log',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'let\'s you set the log channel',
        longDescription: 'assigns, unassigns and lists the log and case channel',
        usages: [
            '{command} [logtype] [channel]',
            '{command} rem [logtype]',
            '{command} list'
        ],
        examples: [
            '{command} normal #logs',
            '{command} case #cases',
            '{command} rem normal',
            '{command} list'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            var argIndex = 0;
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            var argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces
            var guildDoc = await Bot.database.findGuildDoc(message.guild.id);

            if (argsArray[argIndex] == 'rem') { // unset channel as log channel
                argIndex++;
                if (argsArray[argIndex] == 'normal') { // unset normal log channel

                    guildDoc.logChannel = null;
                    guildDoc.save();
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send('Successfully unassigned log channel');
                    Bot.mStats.logMessageSend();
                    Bot.mStats.logCommandUsage(command.name, 'remove');

                } else if (argsArray[argIndex] == 'case') { // unset case log channel

                    guildDoc.caseChannel = null;
                    guildDoc.save();
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send('Successfully unassigned case channel');
                    Bot.mStats.logMessageSend();
                    Bot.mStats.logCommandUsage(command.name, 'remove');
                }

                return;
            }
            if (argsArray[argIndex] == 'list') { // show set channel settings
                var guildObject = guildDoc.toObject();
                var logChannel = null;
                var caseChannel = null;

                if (!guildObject.logChannel && !guildObject.caseChannel) { // if both aren't set
                    message.channel.send('Currently no channel is assigned as log or case channel');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                if (!guildObject.logChannel) { logChannel = 'not defined' } else logChannel = Bot.client.channels.get(guildObject.logChannel).toString();
                if (!guildObject.caseChannel) { caseChannel = 'not defined' } else caseChannel = Bot.client.channels.get(guildObject.caseChannel).toString();

                // send requested information
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send('Current log channel is ' + logChannel + ' and the current case channel is ' + caseChannel);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'list');
                return;
            }
            let channelType;
            if (argsArray[argIndex] == 'normal') { // set normal log channel
                argIndex++;
                var channel = stringToChannel(message.guild, argsArray[argIndex]);
                if (!channel) { // if channel could not be found
                    message.channel.send('Couldn\'t find specified channel');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                // set channel
                guildDoc.logChannel = channel.id;
                guildDoc.save();
                channelType = 'log';
            }

            if (argsArray[argIndex] == 'case') { // set case log channel
                argIndex++;
                var channel = stringToChannel(message.guild, argsArray[argIndex]);
                if (!channel) { // uf channel could not be found
                    message.channel.send('Couldn\'t find specified channel');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                // set channel
                guildDoc.caseChannel = channel.id;
                guildDoc.save();
                channelType = 'case';
            }

            // send a confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`Successfully assigned ${channelType} channel to` + channel.toString());
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name, 'set');

        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;