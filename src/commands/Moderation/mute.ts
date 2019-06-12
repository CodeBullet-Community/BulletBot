import { Message, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember, stringToDuration } from '../../utils/parsers';
import { durations } from '../../utils/time';

async function getMuteRole(guild: Guild) {
    let role = guild.roles.find(x => x.name.toLowerCase() == 'muted');
    if (role) return role;
    if (!guild.me.hasPermission(['MANAGE_ROLES', 'MANAGE_CHANNELS'])) return undefined;
    role = await guild.createRole({
        name: 'Muted',
        color: [129, 131, 134],
        mentionable: false,
        permissions: 0
    }, 'Creating Muted role');
    for (const channel of guild.channels.array()) {
        await channel.overwritePermissions(role, { 'SEND_MESSAGES': false, 'ADD_REACTIONS': false }, 'Adding Muted role');
    }
    return role;
}

async function createMute(message: Message, member: GuildMember, reason: string, duration: number, deletePending: boolean) {
    let caseObject = await Bot.caseLogger.logMute(message.guild, member, message.member, reason, duration ? duration : undefined);
    if (duration) {
        Bot.pActions.addMute(message.guild.id, member.user.id, message.createdTimestamp + duration, caseObject.caseID);
    } else if (deletePending) {
        Bot.pActions.removeMute(message.guild.id, member.user.id);
    }
}

var command: commandInterface = {
    name: 'mute',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Mute members',
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
                        'value': 'Mute members for a certain or indefinite time. You can also change the mute time after a user was already muted'
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
                        'value': '{command} @jeff#1234 spamming\n{command} @jeff#1234 1d12h20m1s requesting a very specific muting duration'.replace(/\{command\}/g, prefix + command.name)
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
                return false; // was unsuccessful
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
                message.channel.send('You can\'t mute yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) {
                message.channel.send('Don\'t mute me :frowning:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await getPermLevel(member) >= permLevels.mod) {
                message.channel.send('You can\'t mute that member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!await message.guild.me.hasPermission("MANAGE_ROLES")) {
                message.channel.send("I do not have the permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            let time = await stringToDuration(argsArray[argIndex]);
            let stringTime = time ? durationToString(time) : 'an indefinite time';

            let reason = args.slice(args.indexOf(argsArray[time ? 1 : 0]) + argsArray[time ? 1 : 0].length).trim();

            let muteRole = member.roles.find(x => x.name.toLowerCase() == 'muted');
            let alreadyMuted = true;
            if (!muteRole) {
                muteRole = await getMuteRole(message.guild);
                alreadyMuted = false;
            }
            if (!muteRole) {
                message.channel.send('Couldn\'t find or create a `Muted` role');
                Bot.mStats.logMessageSend();
                return false;
            }

            if (!alreadyMuted)
                await member.addRole(muteRole, reason);

            if (!alreadyMuted) {
                createMute(message, member, reason, time, false);

                member.send(`You were muted in **${message.guild.name}** for ${stringTime} ${reason ? 'because of following reason:\n' + reason : ''}`);
                Bot.mStats.logMessageSend();

                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`:white_check_mark: **${member.user.tag} has been muted for ${stringTime}${reason ? ', ' + reason : ''}**`);
                Bot.mStats.logCommandUsage(command.name, 'new');
                Bot.mStats.logMessageSend();
            } else {
                createMute(message, member, reason, time, true);

                member.send(`You mute time was changed in **${message.guild.name}** to ${stringTime} ${reason ? 'because of following reason:\n' + reason : ''}`);
                Bot.mStats.logMessageSend();

                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`:white_check_mark: **${member.user.tag}'s mute time has been changed to ${stringTime}${reason ? ', ' + reason : ''}**`);
                Bot.mStats.logCommandUsage(command.name, 'changed');
                Bot.mStats.logMessageSend();
            }
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;