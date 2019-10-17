import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';
import { durations, timeFormat } from '../../utils/time';
import { pActionActions } from '../../database/schemas';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'bans',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Lists all banned members',
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
                        'value': 'Lists all temporary and permanently banned members'
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
                        'value': '{command}'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command}'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            // get all banned members and temp muted members
            let permBanned = await message.guild.fetchBans();
            let pActionDocs = await Bot.pActions.pActions.find({ action: pActionActions.ban, 'info.guild': message.guild.id }, ['to', 'info.user']).exec();

            // create string for temp banned and subtract the members from permBanned array
            let tempBannedString = '';
            for (let i = 0; i < pActionDocs.length; i++) {
                let userID = pActionDocs[i].toObject().info.user;
                if (i < 20 || pActionDocs.length == 20) {
                    tempBannedString += `<@${userID}> until ${dateFormat(pActionDocs[i].to, timeFormat)}\n`;
                } else if (i == 20) {
                    tempBannedString += `and ${pActionDocs.length - 19} more...`;
                }
                permBanned.delete(userID);
            }
            if (!tempBannedString.length) tempBannedString = '*None*';

            // create string for perm muted
            let permBannedString = '';
            let permBannedArray = permBanned.array()
            for (let i = 0; i < permBannedArray.length; i++) {
                if (i < 20 || permBannedArray.length == 20) {
                    permBannedString += `${permBannedArray[i]}\n`;
                } else {
                    permBannedString += `and ${permBannedArray.length - 19} more...`;
                    break;
                }
            }
            if (!permBannedString.length) permBannedString = '*None*';

            // send information
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send({
                "embed": {
                    "color": Bot.database.settingsDB.cache.embedColors.default,
                    "timestamp": new Date().toISOString(),
                    "author": {
                        "name": "Banned Members",
                        "icon_url": message.guild.iconURL
                    },
                    "fields": [
                        {
                            "name": `Temporary Banned [${pActionDocs.length}]`,
                            "value": tempBannedString,
                            "inline": true
                        },
                        {
                            "name": `Perma Banned [${permBannedArray.length}]`,
                            "value": permBannedString,
                            "inline": true
                        }
                    ]
                }
            });
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name);
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;