import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';


var command: commandInterface = {
    name: 'softban',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    help: {
        shortDescription: 'Kick members and delete all their messages/reactions',
        longDescription: 'Ban and then immediately unban a member. This will kick the member and also delete all their reactions and messages from the last 7 days.',
        usages: [
            '{command} [member]',
            '{command} [member] [reason]'
        ],
        examples: [
            '{command} @jeff#1234',
            '{command} @jeff#1234 for not being a good boi'
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

            let member = await stringToMember(message.guild, argsArray[argIndex], false, false, false);
            if (!member) { // check if it found the specified member
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) { // check if the requester is the same member
                message.channel.send('You can\'t softban yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) { // check if the member is the bot
                message.channel.send('You can\'t softban me :smiling_imp:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await getPermLevel(member) >= permLevels.mod) { // check if member is mod or higher
                message.channel.send('You can\'t softban that member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!await message.guild.me.hasPermission("BAN_MEMBERS")) { // check if the bot has the permissions to ban members
                message.channel.send("I don\'t have the permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }

            // get the reason
            let reason = args.slice(args.indexOf(argsArray[0]) + argsArray[0].length).trim();

            // make a case
            await Bot.caseLogger.logSoftban(message.guild, member, message.member, reason);
            // dm to member that they has been softbanned
            await member.send(`You were softbanned (kicked + deleting all your messages/reactions) from **${message.guild.name}** ${reason.length ? 'for:\n' + reason : ''}`);
            // softban member
            await member.ban({ reason: reason, days: 7 });
            message.guild.unban(member, 'auto unban for softban');

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${member.user.tag} has been softbanned, ${reason}**`);
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