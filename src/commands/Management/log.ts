import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number,number]) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return false;
        }
        var argsArray = args.split(' ').filter(x => x.length != 0);
        var guildDoc = await Bot.database.findGuildDoc(message.guild.id);

        if (argsArray[argIndex] == 'rem') {
            guildDoc.logChannel = null;
            guildDoc.save();
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send('Successfully unassigned log channel');
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name, 'remove');
            return;
        }
        if (argsArray[argIndex] == 'list') {
            var guildObject = guildDoc.toObject();
            if (!guildObject.logChannel) {
                message.channel.send('Currently no channel is assigned as log channel');
                Bot.mStats.logMessageSend();
                return false;
            }
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send('Current log channel is ' + Bot.client.channels.get(guildObject.logChannel).toString());
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name, 'list');
            return;
        }

        var channel = stringToChannel(message.guild, argsArray[argIndex]);
        if (!channel) {
            message.channel.send('Couldn\'t find specified channel');
            Bot.mStats.logMessageSend();
            return false;
        }
        guildDoc.logChannel = channel.id;
        guildDoc.save();

        Bot.mStats.logResponseTime(command.name, requestTime);
        message.channel.send('Successfully assigned log channel to ' + channel.toString());
        Bot.mStats.logMessageSend();
        Bot.mStats.logCommandUsage(command.name, 'set');
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'log';
command.path = '';
command.dm = false;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'let\'s you set the log channel';
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
                    'value': 'assignes/unassignes and list log channel'
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
                    'value': '{command} [channel]\n{command} rem\n{command} list'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} #logs\n{command} rem\n{command} list'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;