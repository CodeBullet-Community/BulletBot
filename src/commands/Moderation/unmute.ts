import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
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
    help: {
        shortDescription: 'Unmute members',
        longDescription: 'Unmute muted members',
        usages: [
            '{command} [member] [reason]'
        ],
        examples: [
            '{command} @jeff#1234',
            '{command} @jeff#1234 accidentally muted him'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            // check if the bot has permission to remove the muted role
            if (!await message.guild.me.hasPermission("MANAGE_ROLES")) {
                message.channel.send("I don\'t have the right permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }

            args = args.trim();

            // get member to unmute
            let memberString = args.split(' ').shift();
            let member = await stringToMember(message.guild, memberString, true, true, false);
            if (!member) { // check if it found the specified member
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) { // check if the requester is the same member
                message.channel.send('You can\'t unmute yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) { // check if the member is the bot
                message.channel.send('You can\'t unmute me :smiling_imp:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await guildWrapper.getPermLevel(member) >= permLevels.mod) { // check if member is mod or higher
                message.channel.send('You can\'t unmute that member');
                Bot.mStats.logMessageSend();
                return false;
            }

            // get the reason
            let reason = args.slice(memberString.length).trim();

            // remove pending unmute action
            await Bot.pActions.removeMute(message.guild.id, member.id);
            // get muted role
            let role = member.roles.find(x => x.name.toLocaleLowerCase() == 'muted');
            if (!role) { // if muted role wasn't found on the member
                message.channel.send('Member isn\'t muted');
                Bot.mStats.logMessageSend();
                return false;
            }
            // unmute member
            await member.removeRole(role, `Manual unmuted by ${message.author.tag} (${message.author.id})`);
            // make a case
            await Bot.caseLogger.logUnmute(message.guild, member, message.member, reason);

            // dm to member that they has been unmuted
            member.send(`You were unmuted in **${message.guild.name}** ${reason.length ? 'for:\n' + reason : ''}`);
            Bot.mStats.logMessageSend();

            // send confirmation message
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