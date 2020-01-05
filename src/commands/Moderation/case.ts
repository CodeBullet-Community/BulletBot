import { Message, RichEmbed, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { durationToString, permToString, stringToChannel, stringToMember, stringToRole } from '../../utils/parsers';
import { caseActions, caseDoc } from '../../database/schemas';

var command: commandInterface = {
    name: 'case',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    help: {
        shortDescription: 'list or view cases',
        longDescription: 'list or view cases of a guild or member',
        usages: [
            '{command} list [member]',
            '{command} view [caseID]'
        ],
        examples: [
            '{command} list',
            '{command} list @jeff#1234',
            '{command} view 32'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length === 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            // if member wants to list cases
            if (argsArray[argIndex] == 'list') {
                argIndex++;
                // if no further arguments were provided send a list of all cases
                if (!argsArray[argIndex]) {
                    let embed = await createTotalEmbed(message.guild);
                    let detailEmbeds = await createDetailEmbeds(message.guild);

                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(embed);
                    for (let i = 0; detailEmbeds.length > i; i++) {
                        message.channel.send(detailEmbeds[i]);
                    }
                    Bot.mStats.logMessageSend();
                    Bot.mStats.logCommandUsage(command.name);
                    return true;
                }
                if (argsArray[argIndex]) {
                    // parse member which to get cases of
                    let caseMember = await stringToMember(message.guild, args.substr(4));
                    if (!caseMember) {
                        message.channel.send(`Cannot find user '${args.substr(4).replace('@', '')}'`);
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // generate embeds and send them
                    let totalEmbed = await createTotalEmbed(message.guild, caseMember);
                    let detailEmbeds = await createDetailEmbeds(message.guild, caseMember);
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(totalEmbed);
                    for (let i = 0; detailEmbeds.length > i; i++) {
                        message.channel.send(detailEmbeds[i]);
                    }
                    Bot.mStats.logMessageSend();
                    Bot.mStats.logCommandUsage(command.name);
                    return true;
                }
            }

            // if requester want to view details of a case
            if (argsArray[argIndex] == 'view') {
                argIndex++;
                if (!argsArray[argIndex] || isNaN(Number(argsArray[argIndex]))) {
                    message.channel.send('Please provide a valid case ID');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                let embed = await createSpecificEmbed(message.guild, Number(argsArray[argIndex]));
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(embed);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name);
            }

        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }

    }
};

/**
 * creates a embed with a summary of all cases
 *
 * @param {Guild} guild guild to get cases from 
 * @param {GuildMember} [member] optional query parameter, so it only lists cases of a certain user
 * @returns
 */
async function createTotalEmbed(guild: Guild, member?: GuildMember) {
    let subject;
    let id: string;
    let name: string;
    let avatar: string;
    let query;
    let cases;

    // get values of either member or whole guild
    if (member) {
        subject = member;
        id = member.id;
        name = member.user.tag;
        avatar = member.user.displayAvatarURL;
        query = await Bot.caseLogger.findByMember(guild.id, member.id);
        cases = resolveTotalCases(query);
    } else {
        id = guild.id;
        name = guild.name;
        avatar = guild.iconURL;
        query = await Bot.caseLogger.findByGuild(guild.id);
        cases = resolveTotalCases(query);
        subject = guild.name;
    }

    // create embed
    let embed = new RichEmbed();
    embed.setAuthor(name, avatar);
    embed.setColor(Bot.settings.embedColors.default);
    embed.setDescription(`All cases for ${subject}`);
    embed.addField("Count", `Total: ${cases.total}\nWarn: ${cases.warn}\n Mute: ${cases.mute}\nKick: ${cases.kick}\nSoftban: ${cases.softban}\nBan: ${cases.ban}\nUnmute: ${cases.unmute}\nUnban: ${cases.unban}`);
    embed.setFooter(`ID: ${id}`);
    embed.setTimestamp();

    return embed;
}

/**
 * counts the different case actions from the result of a query
 *
 * @param {*} query result of query
 * @returns
 */
function resolveTotalCases(query) {
    var caseResolved = { unmute: 0, mute: 0, unban: 0, ban: 0, kick: 0, warn: 0, softban: 0, total: 0 };
    for (let i = 0; query.length > i; i++) {
        caseResolved.total += 1;
        switch (query[i].action) {
            case caseActions.ban: caseResolved.ban++; break;
            case caseActions.warn: caseResolved.warn++; break;
            case caseActions.mute: caseResolved.mute++; break;
            case caseActions.kick: caseResolved.kick++; break;
            case caseActions.softban: caseResolved.softban++; break;
            case caseActions.unmute: caseResolved.unmute++; break;
            case caseActions.unban: caseResolved.unban++; break;
        }
    }
    return caseResolved;
}

/**
 * returns an array of embeds with each max 10 cases listed
 *
 * @param {Guild} guild guild to get cases from 
 * @param {GuildMember} [member] optional query parameter, so it only lists cases of a certain user
 * @returns
 */
async function createDetailEmbeds(guild: Guild, member?: GuildMember) {
    let cases: caseDoc[]
    if (member) { // get either all cases from a member or the whole guild
        cases = await Bot.caseLogger.findByMember(guild.id, member.id);
    } else {
        cases = await Bot.caseLogger.findByGuild(guild.id);
    }
    let detailEmbedArray = [];
    let caseIndex = 0;
    let numOfCases = cases.length;
    let tempCase: caseDoc;
    let tempMod;
    let tempMember;
    let embed;

    while ((cases.length - caseIndex) > 0) { // runs until there are no cases left
        embed = new RichEmbed();
        embed.setColor(Bot.settings.embedColors.default);
        // puts 10 cases into an embed
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

            embed.addField(`Case ${tempCase.caseID} | ${capitalizeFirstLetter(tempCase.action)} | ${date.toDateString()} ${date.toTimeString().substr(0, 8)}`, `**User:** ${tempMember}\n**Mod:** ${tempMod}\n**Reason:** ${tempCase.reason}${tempCase.duration ? `\n**Duration:** ${durationToString(tempCase.duration)}` : ''}`);
            caseIndex++;
        }
        numOfCases -= 10;
        detailEmbedArray.push(embed);
    }
    return detailEmbedArray;

}

/**
 * creates a embed with details about a single case
 *
 * @param {Guild} guild guild to get case from
 * @param {string} caseID case ID
 * @returns
 */
async function createSpecificEmbed(guild: Guild, caseID: number) {
    // get case
    let tempCase = await Bot.caseLogger.findByCase(guild.id, caseID);
    if (!tempCase) {
        return 'Case not found';
    }

    let embed = new RichEmbed();

    // get user affected by the action
    let user: GuildMember | string;
    user = await stringToMember(guild, tempCase.user);
    if (!user) user = tempCase.user;

    // get mod that requested the action
    let mod;
    mod = await stringToMember(guild, tempCase.mod);
    if (!mod) mod = tempCase.mod;

    // get color
    let color = resolveColor(tempCase.action);
    let date = new Date(tempCase.timestamp);

    // create embed
    embed.setAuthor(`Case ${caseID} | ${capitalizeFirstLetter(tempCase.action)} | ${user instanceof GuildMember ? user.user.tag : user}`, user instanceof GuildMember ? user.user.displayAvatarURL : undefined);
    embed.setTimestamp(date);
    embed.setColor(color);
    embed.addField("Mod: ", mod, true);
    embed.addField("User: ", user, true);
    if (tempCase.duration) embed.addField("Duration: ", durationToString(tempCase.duration), true);
    if (tempCase.reason) embed.addField("Reason: ", tempCase.reason);

    return embed;
}

/**
 * capitalizes first letter of sting
 *
 * @param {*} string
 * @returns
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * returns one of the pre set colors depending on the action
 *
 * @param {string} action
 * @returns
 */
function resolveColor(action: string) {
    switch (action) {
        case caseActions.warn: return Bot.settings.embedColors.warn;
        case caseActions.ban || caseActions.kick || caseActions.mute || caseActions.softban: return Bot.settings.embedColors.negative;
        case caseActions.unmute || caseActions.unban: return Bot.settings.embedColors.positive;
        default: return Bot.settings.embedColors.default;
    }
}

export default command;
