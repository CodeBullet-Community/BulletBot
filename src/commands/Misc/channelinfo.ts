import { RichEmbed } from 'discord.js';
import { commandInterface } from '../../commands';
import { PermLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { stringToChannel } from '../../utils/parsers';
import { getDayDiff, timeFormat } from '../../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'channelinfo',
    path: '',
    dm: false,
    permLevel: PermLevels.member,
    togglable: false,
    help: {
        shortDescription: 'returns infos about a channel',
        longDescription: 'returns infos about a channel',
        usages: [
            '{command} [channel]'
        ],
        examples: [
            '{command} #bot-commands'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {

            if (args.length === 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            // get channel which to send info of
            var infoChannel = stringToChannel(message.guild, args);
            if (!infoChannel) {
                returnNegative();
                return false;
            }

            // create info embed for channel
            var guild = infoChannel.guild;
            var channelEmbed;
            if (infoChannel.type == "text") channelEmbed = createTextChannelEmbed(infoChannel, guild);
            else if (infoChannel.type == "voice") channelEmbed = createVoiceChannelEmbed(infoChannel, guild);
            else {
                returnNegative();
                return false;
            }

            // check if member can even see the channel
            if (!infoChannel.memberPermissions(message.member).has('VIEW_CHANNEL')) {
                returnNegative();
                return false;
            }
            // send info embed
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
        function returnNegative() {
            message.channel.send(`${args.replace('@', ' ')} is not a valid channel!`);
            Bot.mStats.logMessageSend();
            return false;
        }
    }
};

/**
 * creates a rich embed with info about a text channel
 *
 * @param {*} infoChannel text channel
 * @param {*} guild guild of the text channel
 * @returns
 */
function createTextChannelEmbed(infoChannel, guild) {
    var date = new Date();

    // get last channel info and parent channel
    var channelParent;
    var lastMessage;
    var lastMessageDays;
    try { channelParent = infoChannel.parent.name; }
    catch (ex) { channelParent = 'None'; }
    try {
        lastMessage = dateFormat(infoChannel.lastMessage.createdAt, timeFormat);
        lastMessageDays = `(${getDayDiff(infoChannel.lastMessage.createdAt, date.getTime())} days ago)`
    }
    catch (ex) {
        lastMessage = 'N/A';
        lastMessageDays = '';
    }

    // create a embed
    var embed = new RichEmbed();
    embed.setAuthor(`Description of ${infoChannel.name}`);
    embed.setFooter(`ID: ${infoChannel.id}`);
    // @ts-ignore
    embed.setTimestamp(date.toISOString());
    embed.setColor(Bot.settings.embedColors.default);
    embed.addField("Created", `${dateFormat(infoChannel.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.createdAt, date.getTime())} days ago)`, true);
    embed.addField("Last Message Sent", `${lastMessage} \n ${lastMessageDays}`, true);
    guild.fetchMembers();
    embed.addField("Members", (infoChannel.members.size), true);
    embed.addField("NSFW", infoChannel.nsfw, true);
    if (infoChannel.rateLimitPerUser > 0) embed.addField("Slowmode", `${infoChannel.rateLimitPerUser} seconds`, true);
    embed.addField("Position", infoChannel.position + 1, true);
    embed.addField("Category", channelParent, true);

    return embed;
}

/**
 * creates a rich embed with info about a voice channel
 *
 * @param {*} infoChannel voice channel 
 * @param {*} guild guild of a voice channel
 * @returns
 */
function createVoiceChannelEmbed(infoChannel, guild) {
    var date = new Date();

    // get user limit
    var userLimit = infoChannel.userLimit;
    if (userLimit == 0) userLimit = 'unlimited';

    // get parent channel
    var channelParent;
    try { channelParent = infoChannel.parent.name; }
    catch (ex) { channelParent = 'None'; }

    // create embed
    var embed = new RichEmbed();
    embed.setAuthor(`Description of ${infoChannel.name}`);
    embed.setFooter(`ID: ${infoChannel.id}`);
    // @ts-ignore
    embed.setTimestamp(date.toISOString());
    embed.setColor(Bot.settings.embedColors.default);
    embed.addField("Created", `${dateFormat(infoChannel.createdAt, timeFormat)} \n (${getDayDiff(infoChannel.createdAt, date.getTime())} days ago)`, true);
    guild.fetchMembers();
    embed.addField("Currently connected", infoChannel.members.size, true);
    embed.addField("Bitrate", infoChannel.bitrate, true);
    embed.addField("User limit", userLimit, true);
    embed.addField("Position", infoChannel.position + 1, true);
    embed.addField("Category", channelParent, true);

    return embed;
}

export default command;
