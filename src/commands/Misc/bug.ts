import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import request = require('request');
import { durations, getDurationDiff } from '../../utils/time';

var command: commandInterface = {
    name: 'bug',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    cooldownGlobal: durations.second * 20,
    shortHelp: 'reports a bug to the devs',
    embedHelp: async function (guild: Guild) {
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
                        'value': 'reports a bug to the dev. Be as descriptive as you can'
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
                        'name': 'Global Cooldown:',
                        'value': getDurationDiff(command.cooldownGlobal, 0, durations.second) + 'sec',
                        'inline': true
                    },
                    {
                        'name': 'Usage:', // all possible inputs to the guild, the arguments should be named
                        'value': '{command} [bug]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:', // example use of the command
                        'value': '{command} This feature doesn\'t work with that'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) {
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            request.post('https://docs.google.com/forms/d/e/1FAIpQLScWsqLDncKzqSgmZuFhuwenqexzmKSr0K_B4GSOgoF6fEBcMA/formResponse', {
                form: {
                    'entry.668269162': (!dm ? message.guild.id : undefined),
                    'entry.1681307100': (!dm ? message.guild.name : undefined),
                    'entry.939179046': message.author.id,
                    'entry.1772634886': message.author.username,
                    'entry.2084912430': message.id,
                    'entry.1743035358': message.channel.id,
                    'entry.110649897': args
                }
            });
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