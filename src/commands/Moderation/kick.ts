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
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            let member = await stringToMember(message.guild, argsArray[argIndex], false, false, false);
            if (!member) { // check if it found the specified member
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) { // check if the requester is the same member
                message.channel.send('You can\'t kick yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) { // check if the member is the bot
                message.channel.send('You can\'t kick me :smiling_imp:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await getPermLevel(member) >= permLevels.mod) { // check if member is mod or higher
                message.channel.send('You can\'t kick that member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!await message.guild.me.hasPermission("KICK_MEMBERS")) { // check if the bot has the permissions to kick members
                message.channel.send("I don\'t have the permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }

            // get the reason
            let reason = args.slice(args.indexOf(argsArray[0]) + argsArray[0].length).trim();

            // make a case
            await Bot.caseLogger.logKick(message.guild, member, message.member, reason);
            // dm to member that they has been kicked
            await member.send(`You were kicked from **${message.guild.name}** ${reason ? 'for:\n' + reason : ''}`);
            Bot.mStats.logMessageSend();
            // kick member
            member.kick(reason);

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${member.user.tag} has been kicked${reason ? ', ' + reason : ''}**`);
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