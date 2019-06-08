import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'kick',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Kick members',
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
                        'value': 'Kick a member from this server'
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
                        'name': 'Local Cooldown:',
                        'value': durationToString(command.cooldownLocal),
                        'inline': true
                    },
                    {
                        'name': 'Usage:',
                        'value': '{command} [member]\n{command} [member] [reason]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} @jeff#1234\n{command} @jeff#1234 for not being a good boi'.replace(/\{command\}/g, prefix + command.name)
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
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0);

            let member = await stringToMember(message.guild, argsArray[argIndex]);
            if (!member) {
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) {
                message.channel.send('You can\'t kick yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) {
                message.channel.send('You can\'t kick me :smiling_imp:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await getPermLevel(member) >= permLevels.mod) {
                message.channel.send('You can\'t kick that member');
                Bot.mStats.logMessageSend();
                return false;
            }

            let reason = args.substr(args.indexOf(argsArray[0]) + argsArray[0].length);

            await Bot.caseLogger.logKick(message.guild, member, message.member, reason);
            await member.send(`You were kick from **${message.guild.name}** ${reason ? 'because of following reason:\n' + reason: ''}`);
            member.kick();

            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${member.user.tag} has been kicked ${reason ? 'for ' + reason :''}**`);
            Bot.mStats.logCommandUsage(command.name);
            Bot.mStats.logMessageSend();
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;