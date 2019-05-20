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
                returnNegative();
                return false;
            }
            var channelEmbed;
            if(infoChannel.type == "text") channelEmbed = createTextChannelEmbed(infoChannel);
            else if(infoChannel.type == "voice") channelEmbed = createVoiceChannelEmbed(infoChannel);
            else {
                returnNegative();
                return false;
            }

            if(!infoChannel.memberPermissions(message.member).has('VIEW_CHANNEL')){
                returnNegative();
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
        function returnNegative(){
            message.channel.send(`${args.replace('@',' ')} is not a valid channel!`);
            Bot.mStats.logMessageSend();
            return false;
        }
    }
};

function createTextChannelEmbed(infoChannel){
    var date = new Date();
    var channelParent;
    var lastMessage;
    var lastMessageDays;
    try{channelParent = infoChannel.parent.name;}
    catch(ex){channelParent = 'None';}
    try{
        lastMessage = dateFormat(infoChannel.lastMessage.createdAt, timeFormat);
        lastMessageDays = `(${getDayDiff(infoChannel.lastMessage.createdAt, date.getTime())} days ago)`
    }
    catch(ex){
        lastMessage = 'N/A';
        lastMessageDays = '';
    }
    var embed = new RichEmbed();
    embed.setAuthor(`Description of ${infoChannel.name}`);
    embed.setFooter(`ID: ${infoChannel.id}`);
    // @ts-ignore
    embed.setTimestamp(date.toISOString());
    embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
    embed.addField("Created",`${dateFormat(infoChannel.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.createdAt, date.getTime())} days ago)`,true);
    embed.addField("Last Message Sent", `${lastMessage} \n ${lastMessageDays}`,true);
    embed.addField("Members",infoChannel.members.size,true);
    embed.addField("NSFW",infoChannel.nsfw,true);
    if(infoChannel.rateLimitPerUser>0) embed.addField("Slowmode",`${infoChannel.rateLimitPerUser} seconds`,true);
    embed.addField("Position",infoChannel.position+1,true);
    embed.addField("Category",channelParent,true);

    return embed;
}

function createVoiceChannelEmbed(infoChannel){
    var date = new Date();
    var userLimit = infoChannel.userLimit;
    if(userLimit == 0) userLimit = 'unlimited';
    var channelParent;
    try{channelParent = infoChannel.parent.name;}
    catch(ex){channelParent = 'None';}
    var embed = new RichEmbed();
    embed.setAuthor(`Description of ${infoChannel.name}`);
    embed.setFooter(`ID: ${infoChannel.id}`);
    // @ts-ignore
    embed.setTimestamp(date.toISOString());
    embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
    embed.addField("Created",`${dateFormat(infoChannel.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.createdAt, date.getTime())} days ago)`,true);
    embed.addField("Currently connected",infoChannel.members.size,true);
    embed.addField("Bitrate",infoChannel.bitrate,true);
    embed.addField("User limit",userLimit,true);
    embed.addField("Position",infoChannel.position+1,true);
    embed.addField("Category",channelParent,true);

    return embed;
}

export default command;
