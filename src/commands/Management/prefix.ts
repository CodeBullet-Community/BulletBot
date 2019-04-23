import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        if (args.length == 0) {
            Bot.mStats.logResponseTime(command.name, requestTimestamp);
            message.channel.send(`My prefix is \`${await Bot.database.getPrefix(message.guild)}\``);
            Bot.mStats.logCommandUsage(command.name, 'list');
            Bot.mStats.logMessageSend();
            return;
        }

        var prefixDoc = await Bot.database.mainDB.prefix.findOne({ guild: message.guild.id });
        if (args == 'reset' || args == Bot.database.settingsDB.cache.prefix) {
            if (prefixDoc) {
                var oldPrefix: string = prefixDoc.toObject().prefix;
                prefixDoc.remove();
                Bot.mStats.logResponseTime(command.name, requestTimestamp);
                message.channel.send(`Successfully reset the prefix to \`${Bot.database.settingsDB.cache.prefix}\``);
                Bot.logger.logPrefix(message.guild, message.member, oldPrefix, Bot.database.settingsDB.cache.prefix);
            } else {
                Bot.mStats.logResponseTime(command.name, requestTimestamp);
                message.channel.send(`This server doesn't have a custom prefix`);
            }
            Bot.mStats.logCommandUsage(command.name, 'reset');
            Bot.mStats.logMessageSend();
            return;
        }

        if (args.length > 10) {
            message.channel.send('The custom prefix shouldn\'t be longer then 10 characters.');
            Bot.mStats.logMessageSend();
            return;
        }
        var oldPrefix = Bot.database.settingsDB.cache.prefix;
        if (!prefixDoc) {
            prefixDoc = new Bot.database.mainDB.prefix({ guild: message.guild.id, prefix: args });
        } else {
            oldPrefix = prefixDoc.toObject().prefix;
            prefixDoc.prefix = args;
        }
        prefixDoc.save();
        Bot.mStats.logResponseTime(command.name, requestTimestamp);
        message.channel.send(`Successfully set the prefix to \`${args}\``);
        Bot.logger.logPrefix(message.guild, message.member, oldPrefix, args);
        Bot.mStats.logCommandUsage(command.name, 'set');
        Bot.mStats.logMessageSend();

    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'prefix';
command.path = '';
command.dm = false;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'sets custom prefix';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.helpEmbedColor,
            'author': {
                'name': 'Command: ' + prefix + command.name
            },
            'fields': [
                {
                    'name': 'Description:',
                    'value': 'let\'s you set a custom prefix or reset it to the default one.\n`?!prefix` will always list the prefix, even if a custom prefix was set.'
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
                    'value': '{command}\n{command} [custom prefix]\n{command} reset'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command}\n{command} ?\n{command} reset'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;