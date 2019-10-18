import { Message, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';
import { durations, timeFormat } from '../../utils/time';
import { guildObject } from '../../database/schemas';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'locks',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Lists all locked channels',
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
                        'value': 'Lists all temporary and permanently locked channels'
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
            let guildDoc = await Bot.database.findGuildDoc(message.guild.id, ['locks']);
            if (!guildDoc) {
                message.channel.send("Something went wrong");
                Bot.mStats.logMessageSend();
                return false;
            }
            let guildObject: guildObject = guildDoc.toObject();
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
                    "color": Bot.database.settingsDB.cache.embedColors.default,
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