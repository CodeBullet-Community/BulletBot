import { Message, Guild, GuildMember, RichEmbed } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember } from '../../utils/parsers';
import { caseDoc, caseActions } from '../../database/schemas';

/**
 * creates a array of embeds with each max 10 warnings
 *
 * @param {Guild} guild
 * @param {GuildMember} [member]
 * @returns {Promise<RichEmbed[]>}
 */
async function createWarningsEmbeds(guild: Guild, member?: GuildMember): Promise<RichEmbed[]> {
    let cases: caseDoc[]
    if (member) { // either get the  warnings for the member or the whole guild
        cases = await Bot.caseLogger.cases.find({ guild: guild.id, user: member.id, action: caseActions.warn }).exec();
    } else {
        cases = await Bot.caseLogger.cases.find({ guild: guild.id, action: caseActions.warn }).exec();
    }
    if (!cases.length) return []; // incase no warn cases were found
    let detailEmbedArray: RichEmbed[] = [];
    let caseIndex = 0;
    let numOfCases = cases.length;
    let tempCase: caseDoc;
    let tempMod;
    let tempMember;
    let embed;

    while ((cases.length - caseIndex) > 0) { // runs until there are no warn cases left
        embed = new RichEmbed();
        embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
        // puts 10 warnings into an embed
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
    // set title only on the first embed
    detailEmbedArray[0].setAuthor(`Warnings for ${member ? member.user.tag : guild.name} | ${cases.length} Warning${cases.length == 1 ? '' : 's'}`);
    return detailEmbedArray;
}

var command: commandInterface = {
    name: 'warnings',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    help: {
        shortDescription: 'List warnings of guild/members',
        longDescription: 'List warnings of entire guild or a specific member',
        usages: [
            '{command}',
            '{command} [member]'
        ],
        examples: [
            '{command}',
            '{command} @jeff#1234'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {

            let member: GuildMember;
            if (args.length) { // if member was specified
                member = await stringToMember(message.guild, args);
                if (!member) { // check if it found the specified member
                    message.channel.send('Couldn\'t find specified member');
                    Bot.mStats.logMessageSend();
                    return false;
                }
            }

            // get embeds with warnings
            let embeds = await createWarningsEmbeds(message.guild, member);
            Bot.mStats.logResponseTime(command.name, requestTime);
            Bot.mStats.logCommandUsage(command.name);

            // either send all embeds or say that no warnings were found
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