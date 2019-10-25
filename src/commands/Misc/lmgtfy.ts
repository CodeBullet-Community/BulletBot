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
    shortHelp: 'Let Me Google That For You link generator',
    embedHelp: async function (guild: Guild) {
        let prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.embedColors.help,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': 'Let Me Google That For You link generator'
                    },
                    {
                        'name': 'Need to be:',
                        'value': permToString(command.permLevel),
                        'inline': true
                    },
                    {
                        'name': 'Togglable:',
                        'value': command.togglable,
			            'inline': true
                    },
                    {
                        'name': 'DM capable:',
                        'value': command.dm,
                        'inline': true
                    },
                    {
                        'name': 'Usage:',
                        'value': '{command} [search term]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} How do I install node?'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    // TODO: implement different  search engines such as DDG for bangs and img search etc?
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            args = args.trim();
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await command.embedHelp(message.guild));
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
