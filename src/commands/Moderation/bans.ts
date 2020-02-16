import { commandInterface } from '../../commands';
import { PermLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { Durations, timeFormat } from '../../utils/time';
import { PActionActions } from '../../database/schemas';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'bans',
    path: '',
    dm: false,
    permLevel: PermLevels.mod,
    togglable: false,
    cooldownLocal: Durations.second,
    help: {
        shortDescription: 'Lists all banned members',
        longDescription: 'Lists all temporary and permanently banned members',
        usages: [
            '{command}'
        ],
        examples: [
            '{command}'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            // get all banned members and temp muted members
            let permBanned = await message.guild.fetchBans();
            let pActionDocs = await Bot.pActions.pActions.find({ action: PActionActions.ban, 'info.guild': message.guild.id }, ['to', 'info.user']).exec();

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
                    "color": Bot.settings.embedColors.default,
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