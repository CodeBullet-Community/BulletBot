import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'unmute',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Unmute members',
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
                        'value': 'Unmute muted members'
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
                        'value': '{command} [member] [reason]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} @jeff#1234\n{command} @jeff#1234 accidentally muted him'.replace(/\{command\}/g, prefix + command.name)
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
            if (!await message.guild.me.hasPermission("MANAGE_ROLES")) {
                message.channel.send("I don\'t have the right permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }

            args = args.trim();

            let memberString = args.split(' ').shift();
            let member = await stringToMember(message.guild, memberString, true, true, false);
            if (!member) {
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) {
                message.channel.send('You can\'t unmute yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) {
                message.channel.send('You can\'t unmute me :smiling_imp:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await getPermLevel(member) >= permLevels.mod) {
                message.channel.send('You can\'t unmute that member');
                Bot.mStats.logMessageSend();
                return false;
            }

            let reason = args.slice(memberString.length).trim();

            await Bot.pActions.removeMute(message.guild.id, member.id);
            let role = member.roles.find(x => x.name.toLocaleLowerCase() == 'muted');
            if (!role) {
                message.channel.send('Member isn\'t muted');
                Bot.mStats.logMessageSend();
                return false;
            }
            await member.removeRole(role, `Manual unmuted by ${message.author.tag} (${message.author.id})`);
            await Bot.caseLogger.logUnmute(message.guild, member, message.member, reason);

            member.send(`You were unmuted in **${message.guild.name}** ${reason.length ? 'for:\n' + reason : ''}`);
            Bot.mStats.logMessageSend();

            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${member.user.tag} has been unmuted${reason ? ', ' + reason : ''}**`);
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