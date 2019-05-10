import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import request = require('request');
import { durations, getDurationDiff } from '../../utils/time';
import { suggestionForm } from '../../bot-config.json';

var command: commandInterface = {
    name: 'botsuggest',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    cooldownGlobal: durations.second * 20,
    shortHelp: 'make suggestion for bot',
    embedHelp: async function (guild: Guild) {
        var prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.embedColor.help,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': 'Make a suggestion for the bot. Be as descriptive as you can'
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
            let form = {};
            form['entry.' + suggestionForm.serverID] = (!dm ? message.guild.id : undefined);
            form['entry.' + suggestionForm.serverName] = (!dm ? message.guild.name : undefined);
            form['entry.' + suggestionForm.userID] = message.author.id;
            form['entry.' + suggestionForm.userName] = message.author.username;
            form['entry.' + suggestionForm.messageID] = message.id;
            form['entry.' + suggestionForm.channelID] = message.channel.id;
            form['entry.' + suggestionForm.suggestion] = args;
            request.post('https://docs.google.com/forms/d/e/1FAIpQLSee3V4--MxBJqPjoDgfUIw2u22NG-4GBlT92Bbj10-R1ScuHA/formResponse', {
                form: form
            });
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send('Suggestion was logged. Thanks for making one.');
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name);
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;