import { Message, RichEmbed, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import {permToString, stringToChannel, stringToMember, stringToRole} from '../../utils/parsers';
import { getDayDiff, timeFormat } from '../../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'channelinfo',
    path: '',
    dm: false,
    permLevel: permLevels.member,
    togglable: false,
    shortHelp: 'gives a description of a channel',
    embedHelp: async function (guild: Guild) {
        var prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.embedColors.help,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': 'gives a description of a channel'
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
                        'name': 'Usage:', // all possible inputs to the guild, the arguments should be named
                        'value': `${prefix+command.name} [channel]`
                    },
                    {
                        'name': 'Example:', // example use of the command
                        'value': `${prefix+command.name} bot-commands`
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {

            if(args.length === 0){
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            var infoChannel = stringToChannel(message.guild, args);

            if(!infoChannel){
                message.channel.send(`${args.replace('@',' ')} is not a valid channel!`);
                Bot.mStats.logMessageSend();
                return false;
            }
            var channelEmbed;
            if(infoChannel.type == "text") channelEmbed = createTextChannelEmbed(infoChannel, message.guild);
            else if(infoChannel.type == "voice") channelEmbed = createVoiceChannelEmbed(infoChannel, message.guild);
            else {
                message.channel.send(`${args.replace('@',' ')} is not a valid channel type!`);
                Bot.mStats.logMessageSend();
                return false;
            }
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(channelEmbed);
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

function createTextChannelEmbed(infoChannel, guild){
    var date = new Date();
    var channelParent;
    try{channelParent = infoChannel.parent.name;}
    catch(ex){channelParent = 'None';}
    return {
        "embed": {
            "author": {"name" : `Description of ${infoChannel.name}`},
            "footer":{"text" : `ID: ${infoChannel.id}`},
            "timestamp": date.toISOString(),
            "color": Bot.database.settingsDB.cache.embedColors.neutral,
            "fields": [
                {
                    "name" : "Created At",
                    "value": `${dateFormat(infoChannel.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.createdAt, date.getTime())} days ago)`,
                    "inline" : true
                },
                {
                    "name" : "Last Message Sent",
                    "value" : `${dateFormat(infoChannel.lastMessage.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.lastMessage.createdAt, date.getTime())} days ago)`,
                    "inline" : true
                },
                {
                    "name" : "Members",
                    "value" : infoChannel.members.size,
                },
                {
                    "name" : "Typing indicator",
                    "value" : infoChannel.typing,
                    "inline" : true
                },
                {
                    "name" : 'NSFW',
                    "value" : infoChannel.nsfw,
                    "inline" : true
                },
                {
                    "name" : "Position",
                    "value" : infoChannel.position+1,
                    "inline" : true
                },
                {
                    "name" : "Category",
                    "value" : channelParent,
                },
            ]
        }
    };
}

function createVoiceChannelEmbed(infoChannel, guild){
    var date = new Date();
    var userLimit = infoChannel.userLimit;
    if(userLimit == 0) userLimit = 'unlimited';
    var channelParent;
    try{channelParent = infoChannel.parent.name;}
    catch(ex){channelParent = 'None';}
    return {
        "embed": {
            "author": {"name" : `Description of ${infoChannel.name}`},
            "footer":{"text" : `ID: ${infoChannel.id}`},
            "timestamp": date.toISOString(),
            "color": Bot.database.settingsDB.cache.embedColors.neutral,
            "fields": [
                {
                    "name" : "Created At",
                    "value": `${dateFormat(infoChannel.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.createdAt, date.getTime())} days ago)`
                },
                {
                    "name" : "Currently connected",
                    "value" : infoChannel.members.size,
                },
                {
                    "name" : "Bitrate",
                    "value" : infoChannel.bitrate,
                    "inline" : true
                },
                {
                    "name" : 'User limit',
                    "value" : userLimit,
                    "inline" : true
                },
                {
                    "name" : "Position",
                    "value" : infoChannel.position+1,
                    "inline" : true
                },
                {
                    "name" : "Category",
                    "value" : channelParent,
                },
            ]
        }
    };
}

export default command;
