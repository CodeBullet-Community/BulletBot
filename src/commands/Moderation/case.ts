import { Message, RichEmbed, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import {durationToString, permToString, stringToChannel, stringToMember, stringToRole} from '../../utils/parsers';
import { getDayDiff, timeFormat } from '../../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'case',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
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
                        'value': 'lists/deletes all cases of a guild'
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
                        'value': `${prefix+command.name} list [member] \n ${prefix+command.name} delete [caseID] \n ${prefix+command.name} view [caseID]`
                    },
                    {
                        'name': 'Example:', // example use of the command
                        'value': `${prefix+command.name} list\n${prefix + command.name} list Montori\n${prefix+command.name} delete 1559318905494`
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            console.log(2)
            if(args.length === 0){
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            var argIndex = 0;
            var argsArray = args.split(' ').filter(x => x.length != 0);

            if(argsArray[argIndex] == 'list'){
                argIndex++;
                let embed;
                if(!argsArray[argIndex]){
                    embed = await createTotalEmbed(message.guild);
                    message.channel.send(embed);
                    return true;
                }
                if(argsArray[argIndex]){
                    let caseMember = await stringToMember(message.guild, args.substr(4));
                    if(!caseMember){
                        message.channel.send(`Cannot find user '${args.substr(4).replace('@','')}'`);
                        return false;
                    }
                    let totalEmbed = await createTotalEmbed(message.guild, caseMember);
                    let detailEmbeds = await createDetailEmbeds(message.guild, caseMember);
                    message.channel.send(totalEmbed);
                    for(let i = 0; detailEmbeds.length>i; i++){
                        message.channel.send(detailEmbeds[i]);
                    }
                    return true;
                }
            }

            if(argsArray[argIndex] == 'view'){
                argIndex++;
                if(!argsArray[argIndex] || isNaN(Number(argsArray[argIndex]))){
                    message.channel.send('Please provide a valid case ID');
                    return false;
                }
                let embed = await createSpecificEmbed(message.guild,argsArray[argIndex]);
                message.channel.send(embed);
            }

        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }

    }
};

async function createTotalEmbed(guild: Guild, member?: GuildMember){
    let embed = new RichEmbed();

    let subject;
    let id = guild.id;
    let name = guild.name;
    let avatar = guild.iconURL;
    let query = await Bot.caseLogger.findByGuild(guild.id);
    let cases = await resolveTotalCases(query);

    if(member){
        subject = member;
        id = member.id;
        name = member.user.tag;
        avatar = member.user.avatarURL;
        query = await Bot.caseLogger.findByMember(guild.id,member.id);
        cases = await resolveTotalCases(query);
    }else subject = guild.name;

    embed.setAuthor(name,avatar);
    embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
    embed.setDescription(`All cases for ${subject}`);
    embed.addField("Count",`Total: ${cases.total}\nWarn: ${cases.warn}\nMute: ${cases.mute}\n Mute: ${cases.mute}\nKick: ${cases.kick}\nSoftban: ${cases.softban}\nBan: ${cases.ban}\nUnmute: ${cases.unmute}\nUnban: ${cases.unban}`);
    embed.setFooter(`ID: ${id}`);
    embed.setTimestamp();

    return embed;
}

function resolveTotalCases(query){
    var caseResolved = {unmute : 0, mute : 0, unban : 0,ban : 0,kick : 0,warn : 0,softban : 0,total : 0};
    for(let i = 0; query.length > i; i++){
        caseResolved.total += 1;
        switch (query[i].action) {
            case 'Ban': caseResolved.ban++; break;
            case 'Warn': caseResolved.warn++; break;
            case 'Mute': caseResolved.mute++; break;
            case 'Kick': caseResolved.kick++; break;
            case 'Softban': caseResolved.softban++; break;
            case 'Unmute': caseResolved.unmute++; break;
            case 'Unban': caseResolved.unban++; break;
        }
    }
    return caseResolved;
}

async function createDetailEmbeds(guild: Guild, member: GuildMember){
    let cases = await Bot.caseLogger.findByMember(guild.id, member.id);
    let detailEmbedArray = [];
    let caseIndex = 0;
    let numOfCases = cases.length;
    let tempCase;
    let tempMod;
    let embed;

    while((cases.length - caseIndex) > 0){
        embed = new RichEmbed();
        embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
        for(let i = 0; i<10 && numOfCases>i ; i++){
            tempCase = cases[caseIndex];
            let date = new Date(tempCase.timestamp);
            tempMod = await stringToMember(guild, tempCase.mod);
            if(!tempMod) tempMod = cases[caseIndex].mod;

            embed.addField(`Case ${tempCase.caseID} | ${tempCase.action} | ${date.toDateString()} ${date.toTimeString().substr(0,8)}`, `**User:** ${member.user.tag}\n**Mod:** ${tempMod.user.tag}\n**Reason:** ${tempCase.reason}`);
            caseIndex++;
         }
        numOfCases -= 10;
        detailEmbedArray.push(embed);
    }
    return detailEmbedArray;

}

async function createSpecificEmbed(guild: Guild, caseID: string){
    let tempCase = await Bot.caseLogger.findByCase(guild.id, caseID);

    if(!tempCase){
        return 'Case not found';
    }

    let embed = new RichEmbed();

    let user;
    user = await stringToMember(guild,tempCase.user);
    if(!user) tempCase.user;


    let mod;
    mod = await stringToMember(guild,tempCase.mod);
    if(!mod) mod = tempCase.mod;

    let color = resolveColor(tempCase.action);
    let date = new Date(tempCase.timestamp);

    embed.setAuthor(`Case ${caseID} | ${tempCase.action} | ${user.user.tag}`,user.user.avatarURL);
    //@ts-ignore
    embed.setTimestamp(date.toISOString());
    embed.setColor(color);
    embed.addField("Mod: ", mod,true);
    embed.addField("User: ", user,true);
    if(tempCase.duration) embed.addField("Duration: ", durationToString(tempCase.duration),true);
    if(tempCase.reason) embed.addField("Reason: ", tempCase.reason);

    return embed;
}

function resolveColor(action: string){
    switch (action) {
        case 'Warn': return Bot.database.settingsDB.cache.embedColors.warn;
        case 'Ban' || 'Kick' || 'Mute' || 'Softban' : return Bot.database.settingsDB.cache.embedColors.negative;
        case 'Unmute' || 'Unban' : return Bot.database.settingsDB.cache.embedColors.positive;
        default: return Bot.database.settingsDB.cache.embedColors.default;
    }
}

export default command;
