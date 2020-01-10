import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToMember, durationToString } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'reason',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    help: {
        shortDescription: 'Change reason of case',
        longDescription: 'Change or add a reason to a case',
        usages: [
            '{command} [caseID] [reason]'
        ],
        examples: [
            '{command} 14 a totally legit reason`'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            // check if specified case ID 
            if (isNaN(Number(argsArray[0]))) {
                message.channel.send("You need to specify a valid caseID");
                Bot.mStats.logMessageSend();
                return false
            }
            if (!argsArray[1]) {
                message.channel.send("You need to specify a reason");
                Bot.mStats.logMessageSend();
                return false
            }

            // get the reason
            let reason = args.slice(args.indexOf(argsArray[0]) + argsArray[0].length).trim();

            // changes reason
            if (!await Bot.caseLogger.editReason(message.guild.id, argsArray[0], reason)) {
                message.channel.send("Couldn't find specified case");
                Bot.mStats.logMessageSend();
                return false
            }

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **the reason of case ${argsArray[0].replace("@", "")} has been changed to ${reason.replace("@", "")}**`);
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