import { Message, Guild, GuildMember, RichEmbed } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember } from '../../utils/parsers';
import { caseDoc, caseActions } from '../../database/schemas';

async function createWarningsEmbeds(guild: Guild, member?: GuildMember): Promise<RichEmbed[]> {
    let cases: caseDoc[]
    if (member) {
        cases = await Bot.caseLogger.cases.find({ guild: guild.id, user: member.id, action: caseActions.warn }).exec();
    } else {
        cases = await Bot.caseLogger.cases.find({ guild: guild.id, action: caseActions.warn }).exec();
    }
    if (!cases.length) return [];
    let detailEmbedArray: RichEmbed[] = [];
    let caseIndex = 0;
    let numOfCases = cases.length;
    let tempCase: caseDoc;
    let tempMod;
    let tempMember;
    let embed;

    while ((cases.length - caseIndex) > 0) {
        embed = new RichEmbed();
        embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
        for (let i = 0; i < 10 && numOfCases > i; i++) {
            tempCase = cases[caseIndex];
            let date = new Date(tempCase.timestamp);
            tempMod = guild.members.get(tempCase.mod);
            if (!tempMod) tempMod = cases[caseIndex].mod;
            if (member) {
                tempMember = member;
            } else {
                tempMember = guild.members.get(tempCase.user);
                if (!tempMember) tempMember = cases[caseIndex].user;
            }

            embed.addField(`Case ${tempCase.caseID} | ${date.toDateString()} ${date.toTimeString().substr(0, 8)}`, `**User:** ${tempMember}\n**Mod:** ${tempMod}\n**Reason:** ${tempCase.reason}`);
            caseIndex++;
        }
        numOfCases -= 10;
        detailEmbedArray.push(embed);
    }
    detailEmbedArray[0].setAuthor(`Warnings for ${member ? member.user.tag : guild.name} | ${cases.length} Warning${cases.length == 1 ? '' : 's'}`);
    return detailEmbedArray;
}

var command: commandInterface = {
    name: 'warnings',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    shortHelp: 'List warnings of guild/members',
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
                        'value': 'List warnings of entire guild or a specific member' // more detailed desc
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
                        'name': 'Usage:',
                        'value': '{command}\n{command} [member]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command}\n{command} @jeff#1234'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {

            let member: GuildMember;
            if (args.length) {
                member = await stringToMember(message.guild, args);
                if (!member) {
                    message.channel.send('Couldn\'t find specified member');
                    Bot.mStats.logMessageSend();
                    return false;
                }
            }

            let embeds = await createWarningsEmbeds(message.guild, member);
            Bot.mStats.logResponseTime(command.name, requestTime);
            Bot.mStats.logCommandUsage(command.name);

            if (embeds.length) {
                for (const embed of embeds) {
                    message.channel.send(embed);
                    Bot.mStats.logMessageSend();
                }
            } else {
                message.channel.send(`No warnings found`);
                Bot.mStats.logMessageSend();
            }
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;