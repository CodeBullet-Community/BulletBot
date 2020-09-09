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
        shortDescription: 'Sets custom prefix',
        longDescription: 'Lets you set a custom prefix or reset it to the default one.\n`?!prefix` will always list the prefix, even if a custom prefix was set.',
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
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // if no argument was provided reply with prefix
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`My prefix is \`${await Bot.database.getPrefix(message.guild)}\``);
                Bot.mStats.logCommandUsage(command.name, 'list');
                Bot.mStats.logMessageSend();
                return false;
            }

            // load prefix settings from database
            var prefixDoc = await Bot.database.mainDB.prefix.findOne({ guild: message.guild.id });

            if (args == 'reset' || args == Bot.database.settingsDB.cache.prefix) { // if user wants to reset the prefix to default
                if (prefixDoc) { // if a custom prefix is currently set
                    var oldPrefix: string = prefixDoc.toObject().prefix; // cache old prefix for logging
                    prefixDoc.remove(); // remove setting doc which makes the bot use the default

                    // send confirmation message
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`Successfully reset the prefix to \`${Bot.database.settingsDB.cache.prefix}\``);
                    // log that prefix has been changed
                    Bot.logger.logPrefix(message.guild, message.member, oldPrefix, Bot.database.settingsDB.cache.prefix);
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
            var oldPrefix = Bot.database.settingsDB.cache.prefix; // cache old prefix for logging
            if (!prefixDoc) { // when the prefix settings doc doesn't exist (so the default is set)
                prefixDoc = new Bot.database.mainDB.prefix({ guild: message.guild.id, prefix: args });
            } else {
                oldPrefix = prefixDoc.toObject().prefix;
                prefixDoc.prefix = args;
            }
            prefixDoc.save(); // save changes to the database

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