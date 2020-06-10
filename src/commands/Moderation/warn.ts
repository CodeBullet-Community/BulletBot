import { Message, Guild, Util } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToMember, durationToString } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'warn',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    help: {
        shortDescription: 'Warn members for role violations',
        longDescription: 'Warn member for a rule break or something similar',
        usages: [
            '{command} [member] [reason]'
        ],
        examples: [
            '{command} @jeff#1234 being a jerk'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            let user = await stringToMember(message.guild, args.slice(0, args.indexOf(' ')), false, false, false);
            if (!user) { // check if it found the specified member
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }

            // get the reason
            let reason = args.slice(args.indexOf(' ')).trim();
            // make a case
            Bot.caseLogger.logWarn(message.guild, user, message.member, reason);
            // dm to member that they has been warned
            if (!user.user.bot)
                user.send(`You were warned in **${message.guild.name}** for:\n${reason}`);

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${user.user.tag} has been warned, ${Util.escapeMarkdown(reason)}**`);
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
