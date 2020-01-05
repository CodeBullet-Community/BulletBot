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
    name: 'mutes',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    help: {
        shortDescription: 'Lists all muted members',
        longDescription: 'Lists all temporary and permanently muted members.',
        usages: [
            '{command}'
        ],
        examples: [
            '{command}'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            // get all muted members (permMuted) and temp muted (pActionDocs)
            if (message.guild.large) await message.guild.fetchMembers();
            let permMuted = message.guild.members.filter(x => x.roles.find(y => y.name.toLowerCase() == 'muted') != undefined);
            let pActionDocs = await Bot.pActions.pActions.find({ action: pActionActions.mute, 'info.guild': message.guild.id }, ['to', 'info.user']).exec();

            // create string for temp muted and subtract the members from permMuted array
            let tempMutedString = '';
            for (let i = 0; i < pActionDocs.length; i++) {
                let userID = pActionDocs[i].toObject().info.user;
                if (i < 20 || pActionDocs.length == 20) {
                    let member = message.guild.members.get(userID);
                    tempMutedString += `${member} until ${dateFormat(pActionDocs[i].to, timeFormat)}\n`;
                } else if (i == 20) {
                    tempMutedString += `and ${pActionDocs.length - 19} more...`;
                }
                permMuted.delete(userID);
            }
            if (!tempMutedString.length) tempMutedString = '*None*';

            // create string for perm muted
            let permMutedString = '';
            let permMutedArray = permMuted.array()
            for (let i = 0; i < permMutedArray.length; i++) {
                if (i < 20 || permMutedArray.length == 20) {
                    permMutedString += `${permMutedArray[i]}\n`;
                } else {
                    permMutedString += `and ${permMutedArray.length - 19} more...`;
                    break;
                }
            }
            if (!permMutedString.length) permMutedString = '*None*';

            // send information
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send({
                "embed": {
                    "color": Bot.settings.embedColors.default,
                    "timestamp": new Date().toISOString(),
                    "author": {
                        "name": "Muted Members",
                        "icon_url": message.guild.iconURL
                    },
                    "fields": [
                        {
                            "name": `Temporary Muted [${pActionDocs.length}]`,
                            "value": tempMutedString,
                            "inline": true
                        },
                        {
                            "name": `Perma Muted [${permMutedArray.length}]`,
                            "value": permMutedString,
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