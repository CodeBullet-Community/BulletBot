import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { commandsObject, logTypes } from '../../database/schemas';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
    try {
        var argIndex = 0;
        if (args.length == 0) { // send help embed if no arguments provided
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return;
        }
        var argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces
        switch (argsArray[argIndex]) { // the different actions
            case 'list':
                argIndex++;

                if (argsArray[argIndex] == 'disabled') { // if it should only show disabled commands
                    var commandsDoc = await Bot.database.findCommandsDoc(message.guild.id);
                    if (!commandsDoc) { // if the commands doc doesn't exist, no command can be disabled
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send('There aren\'t any disabled commands.');
                        Bot.mStats.logMessageSend();
                    } else {
                        // build embed
                        var output = new RichEmbed();
                        output.setAuthor('Disabled Commands:', Bot.client.user.displayAvatarURL);
                        output.setColor(Bot.database.settingsDB.cache.embedColors.help);

                        // add disabled commands
                        var commandsObject: commandsObject = commandsDoc.toObject();
                        for (const cmdName in commandsObject.commands) {
                            if (commandsObject.commands[cmdName]._enabled) continue;
                            var cmd = Bot.commands.get(cmdName);
                            output.addField((await Bot.database.getPrefix(message.guild)) + cmd.name, cmd.shortHelp);
                        }

                        // send embed or say there aren't any disabled commands
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        if (output.fields.length == 0) {
                            message.channel.send('There aren\'t any disabled commands.');
                        } else {
                            message.channel.send(output);
                        }
                    }
                    Bot.mStats.logCommandUsage(command.name, 'listDisabled');
                    Bot.mStats.logMessageSend();
                    return;
                }

                // if it should just list all commands it just calls the help command
                Bot.commands.get('help').run(message, argsArray[argIndex] ? argsArray[argIndex] : '', permLevel, dm, requestTime);
                break;
            case 'enable':
                argIndex++;
                if (!argsArray[argIndex]) { // check if command is specified
                    message.channel.send('Please input a command');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                var cmd = Bot.commands.get(argsArray[argIndex].toLowerCase());
                if (!cmd) { // check if command exists
                    message.channel.send(`That isn't a command.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }
                if (!cmd.togglable) { // check if command can be disabled
                    message.channel.send(`The \`${cmd.name}\` command isn't togglable.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // load command settings and check if it's already enabled
                var commandsDoc = await Bot.database.findCommandsDoc(message.guild.id);
                var commandSettings = await Bot.database.getCommandSettings(message.guild.id, cmd.name, commandsDoc);
                if (!commandSettings || commandSettings._enabled) {
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`The \`${cmd.name}\` command is already enabled.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // enable command
                commandSettings._enabled = true;
                Bot.database.setCommandSettings(message.guild.id, cmd.name, commandSettings, commandsDoc);

                // send message that it was successfully enabled
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`Successfully enabled the \`${cmd.name}\` command.`);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'enable');
                // log that command was enabled
                Bot.logger.logCommand(message.guild, message.member, cmd, logTypes.add);
                break;
            case 'disable':
                argIndex++;
                if (!argsArray[argIndex]) { // check if command is specified
                    message.channel.send('Please input a command');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                var cmd = Bot.commands.get(argsArray[argIndex].toLowerCase());
                if (!cmd) { // check if command exists
                    message.channel.send(`That isn't a command.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }
                if (!cmd.togglable) { // check if command can be disabled
                    message.channel.send(`The \`${cmd.name}\` command isn't togglable.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // load command settings and check if it's already disabled
                var commandsDoc = await Bot.database.findCommandsDoc(message.guild.id);
                var commandSettings = await Bot.database.getCommandSettings(message.guild.id, cmd.name, commandsDoc);
                if (!commandSettings) { // in case settings for that command don't exist yet
                    commandSettings = {};
                }
                if (commandSettings._enabled === false) {
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`The \`${cmd.name}\` command is already disabled.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // disable command
                commandSettings._enabled = false;
                Bot.database.setCommandSettings(message.guild.id, cmd.name, commandSettings, commandsDoc);

                // send message that it was successfully disabled
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`Successfully disabled the \`${cmd.name}\` command.`);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'disable');
                // log that command was disabled
                Bot.logger.logCommand(message.guild, message.member, cmd, logTypes.remove);
                break;
        }

    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'commands';
command.path = '';
command.dm = false;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'Let\'s you toggle commands';
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
                    'value': 'Let\'s you toggle commands'
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
                    'value': '{command} list\n{command} list [command name/category]\nuse `category/subcategory` to get list from subcategory\n{command} list disabled\n{command} disable [command]\n{command} enable [command]'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} list\n{command} list Fun\n{command} list disabled\n{command} disable animal\n{command} enable animal'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;