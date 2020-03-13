import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember, stringToDuration, stringToUser } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'ban',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    help: {
        shortDescription: 'Ban members',
        longDescription: 'Ban members for a certain or indefinite time. Reason is always optional, but is highly recommended.',
        usages: [
            '{command} [member] [reason]',
            '{command} [member] [duration] [reason]'
        ],
        examples: [
            '{command} @jeff#1234',
            '{command} @jeff#1234 being jeff',
            '{command} @jeff#1234 1d12h20m1s requesting a very specific ban duration'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            let user = await stringToUser(argsArray[argIndex]);
            if (!user) { // check if it found the specified member
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (user.id == message.author.id) { // check if the requester is the same member
                message.channel.send('You can\'t ban yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (user.id == Bot.client.user.id) { // check if the member is the bot
                message.channel.send('Don\'t ban me :frowning:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!await message.guild.me.hasPermission("BAN_MEMBERS")) { // check if the bot has the permissions to ban members
                message.channel.send("I do not have the permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            // parse time to ban member
            let time = await stringToDuration(argsArray[argIndex]);
            let stringTime = time ? durationToString(time) : 'forever';

            // get the reason
            let reason = args.slice(args.indexOf(argsArray[time ? 1 : 0]) + argsArray[time ? 1 : 0].length).trim();

            // make a case
            let caseObject = await Bot.caseLogger.logBan(message.guild, user, message.member, reason, time ? time : undefined);
            // incase a time was set, make a pActions unban task
            if (time) Bot.pActions.addBan(message.guild.id, user.id, message.createdTimestamp + time, caseObject.caseID, message.createdTimestamp);
            // dm to member that they has been banned
            try {
                await user.send(`You were banned in **${message.guild.name}** for ${stringTime} ${reason ? 'because of following reason:\n' + reason : ''}`);
            } catch { }
            // ban member
            message.guild.ban(user, { reason: reason, days: 7 });

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${user.tag} has been banned for ${stringTime}${reason ? ", " + reason : ''}**`);
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