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
    shortHelp: 'Change reason of case',
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
                        'value': 'Change or add a reason to a case'
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
                        'value': `${prefix + command.name} [caseID] [reason]`
                    },
                    {
                        'name': 'Example:',
                        'value': `${prefix + command.name} 538 a totally legit reason`
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

            let argsArray = args.split(' ').filter(x => x.length != 0);

            if(isNaN(Number(argsArray[0]))){
                message.channel.send("You need to specify a valid caseID");
                Bot.mStats.logMessageSend();
                return false
            }
            if(!argsArray[1]){
                message.channel.send("You need to specify a reason");
                Bot.mStats.logMessageSend();
                return false
            }

            let reason = args.slice(args.indexOf(argsArray[0]) + argsArray[0].length).trim();

            if(!await Bot.caseLogger.editReason(message.guild.id, argsArray[0], reason)){
                message.channel.send("Couldn't find specified case");
                Bot.mStats.logMessageSend();
                return false
            }

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