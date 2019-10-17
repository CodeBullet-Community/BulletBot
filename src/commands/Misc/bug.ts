import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';
import request = require('request');
import { durations, getDurationDiff } from '../../utils/time';
import { bugForm } from '../../bot-config.json';

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
                'color': Bot.database.settingsDB.cache.embedColors.help,
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
                        'value': durationToString(command.cooldownGlobal),
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
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            // send suggestion to google form
            let form = {};
            form['entry.' + bugForm.serverID] = (!dm ? message.guild.id : undefined);
            form['entry.' + bugForm.serverName] = (!dm ? message.guild.name : undefined);
            form['entry.' + bugForm.userID] = message.author.id;
            form['entry.' + bugForm.userName] = message.author.username;
            form['entry.' + bugForm.messageID] = message.id;
            form['entry.' + bugForm.channelID] = message.channel.id;
            form['entry.' + bugForm.bug] = args;
            request.post('https://docs.google.com/forms/d/e/1FAIpQLScWsqLDncKzqSgmZuFhuwenqexzmKSr0K_B4GSOgoF6fEBcMA/formResponse', {
                form: form
            });

            // send confirmation message
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