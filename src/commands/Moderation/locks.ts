import dateFormat = require('dateformat');

import { Bot } from '../..';
import { commandInterface } from '../../commands';
import { sendError } from '../../utils/messages';
import { PermLevels } from '../../utils/permissions';
import { Durations, timeFormat } from '../../utils/time';

var command: commandInterface = {
    name: 'locks',
    path: '',
    dm: false,
    permLevel: PermLevels.mod,
    togglable: false,
    cooldownLocal: Durations.second,
    help: {
        shortDescription: 'Lists all locked channels',
        longDescription: 'Lists all temporary and permanently locked channels',
        usages: [
            '{command}'
        ],
        examples: [
            '{command}'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            let guildDoc = await Bot.database.findGuildDoc(message.guild.id, ['locks']);
            if (!guildDoc) {
                message.channel.send("Something went wrong");
                Bot.mStats.logMessageSend();
                return false;
            }
            // turn guild.locks into two arrays
            let permLockedArray = [];
            let tempLockedArray = [];
            for (const channelId in guildDoc.locks) {
                let lockedChannel: any = guildDoc.locks[channelId];
                lockedChannel.channel = channelId;
                (lockedChannel.until ? tempLockedArray : permLockedArray).push(lockedChannel);
            }

            // put permanently locked channels into a string
            let permLockedString = '';
            for (let i = 0; i < permLockedArray.length; i++) {
                if (i < 20 || permLockedArray.length == 20) { // check to only list 20 channels
                    permLockedString += `${message.guild.channels.get(permLockedArray[i].channel)}\n`;
                } else {
                    permLockedString += `and ${permLockedArray.length - 19} more...`;
                    break;
                }
            }
            if (!permLockedString.length) permLockedString = '*None*';

            // put temporary locked channels into a string
            let tempLockedString = '';
            for (let i = 0; i < tempLockedArray.length; i++) {
                if (i < 20 || tempLockedArray.length == 20) { // check to only list 20 channels
                    tempLockedString += `${message.guild.channels.get(tempLockedArray[i].channel)} until ${dateFormat(tempLockedArray[i].until, timeFormat)}\n`;
                } else {
                    tempLockedString += `and ${tempLockedArray.length - 19} more...`;
                    break;
                }
            }
            if (!tempLockedString.length) tempLockedString = '*None*';

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send({
                "embed": {
                    "color": Bot.settings.embedColors.default,
                    "timestamp": new Date().toISOString(),
                    "author": {
                        "name": "Locked Channels",
                        "icon_url": message.guild.iconURL
                    },
                    "fields": [
                        {
                            "name": `Temporary Locked [${tempLockedArray.length}]`,
                            "value": tempLockedString,
                            "inline": true
                        },
                        {
                            "name": `Perma Locked [${permLockedArray.length}]`,
                            "value": permLockedString,
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