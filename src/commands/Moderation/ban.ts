import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember, stringToDuration } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'ban',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Ban members',
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
                        'value': 'Ban members for a certain or indefinite time'
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
                        'value': '{command} [member] [reason]\n{command} [member] [duration] [reason]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} @jeff#1234 showing bobs and vagene\n{command} @jeff#1234 1d12h20m1s requesting a very specific ban duration'.replace(/\{command\}/g, prefix + command.name)
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

            let member = await stringToMember(message.guild, argsArray[argIndex], false, false, false);
            if (!member) {
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) {
                message.channel.send('You can\'t ban yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) {
                message.channel.send('Don\'t ban me :frowning:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await getPermLevel(member) >= permLevels.mod) {
                message.channel.send('You can\'t ban that member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!await message.guild.me.hasPermission("BAN_MEMBERS")) {
                message.channel.send("I do not have the permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            let time = await stringToDuration(argsArray[argIndex]);
            let stringTime = time ? durationToString(time) : 'forever';

            let reason = args.slice(args.indexOf(argsArray[time ? 1 : 0]) + argsArray[time ? 1 : 0].length).trim();

            let caseObject = await Bot.caseLogger.logBan(message.guild, member, message.member, reason, time ? time : undefined);
            if (time) Bot.pActions.addBan(message.guild.id, member.user.id, message.createdTimestamp + time, caseObject.caseID, message.createdTimestamp);
            await member.send(`You were banned in **${message.guild.name}** for ${stringTime} ${reason ? 'because of following reason:\n' + reason : ''}`);
            member.ban({ reason: reason, days: 7 });

            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${member.user.tag} has been banned for ${stringTime}${reason ? ", " + reason : ''}**`);
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