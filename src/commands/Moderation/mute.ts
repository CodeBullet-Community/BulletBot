import { Message, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { PermLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { durationToString, stringToMember, stringToDuration } from '../../utils/parsers';
import { Durations } from '../../utils/time';

/**
 * gets the muted role from a server. Creates one if it couldn't find one
 *
 * @param {Guild} guild guild to get muted role from
 * @returns
 */
async function getMuteRole(guild: Guild) {
    // check if there is already a role called "muted"
    let role = guild.roles.find(x => x.name.toLowerCase() == 'muted');
    if (role) return role;

    // check if bot can create a new role
    if (!guild.me.hasPermission(['MANAGE_ROLES', 'MANAGE_CHANNELS'])) return undefined;
    // create muted role
    role = await guild.createRole({
        name: 'Muted',
        color: [129, 131, 134],
        mentionable: false,
        permissions: 0
    }, 'Creating Muted role');
    // add it to every channel
    for (const channel of guild.channels.array()) {
        await channel.overwritePermissions(role, { 'SEND_MESSAGES': false, 'ADD_REACTIONS': false }, 'Adding Muted role');
    }
    return role;
}

/**
 * creates a mute case and either adds or removes a unmute action from pActions
 *
 * @param {Message} message message from requester
 * @param {GuildMember} member member that was muted
 * @param {string} reason reason why the member was muted
 * @param {number} duration duration of the mute
 * @param {boolean} deletePending if the existing pending unmute action should be removed
 */
async function createMute(message: Message, member: GuildMember, reason: string, duration: number, deletePending: boolean) {
    let caseObject = await Bot.caseLogger.logMute(message.guild, member, message.member, reason, duration ? duration : undefined);
    if (duration) {
        Bot.pActions.addMute(message.guild.id, member.user.id, message.createdTimestamp + duration, caseObject.caseID, message.createdTimestamp);
    } else if (deletePending) {
        Bot.pActions.removeMute(message.guild.id, member.user.id);
    }
}

var command: commandInterface = {
    name: 'mute',
    path: '',
    dm: false,
    permLevel: PermLevels.mod,
    togglable: false,
    cooldownLocal: Durations.second,
    help: {
        shortDescription: 'Mute members',
        longDescription: 'Mute members for a certain or indefinite time. You can also change the mute time after a user was already muted',
        usages: [
            '{command} [member] [reason]',
            '{command} [member] [duration] [reason]'
        ],
        examples: [
            '{command} @jeff#1234 spamming',
            '{command} @jeff#1234 1d12h20m1s requesting a very specific muting duration'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            if (args.length == 0) {
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false; // was unsuccessful
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            let member = await stringToMember(message.guild, argsArray[argIndex], false, false, false);
            if (!member) { // check if it found the specified member
                message.channel.send('Couldn\'t find specified member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == message.author.id) { // check if the requester is the same member
                message.channel.send('You can\'t mute yourself');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (member.user.id == Bot.client.user.id) { // check if the member is the bot
                message.channel.send('Don\'t mute me :frowning:');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (await guildWrapper.getPermLevel(member) >= PermLevels.mod) { // check if member is mod or higher
                message.channel.send('You can\'t mute that member');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!await message.guild.me.hasPermission("MANAGE_ROLES")) { // check if the bot has the permissions to mute  members
                message.channel.send("I do not have the permissions to do that");
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            // parse time to mute member
            let time = await stringToDuration(argsArray[argIndex]);
            let stringTime = time ? durationToString(time) : 'an indefinite time';

            // get the reason
            let reason = args.slice(args.indexOf(argsArray[time ? 1 : 0]) + argsArray[time ? 1 : 0].length).trim();

            // get muted role from member to check if he is already muted
            let muteRole = member.roles.find(x => x.name.toLowerCase() == 'muted');
            let alreadyMuted = true;
            if (!muteRole) { // if muted role wasn't found on member, get it from guild
                muteRole = await getMuteRole(message.guild);
                alreadyMuted = false;
            }
            if (!muteRole) { // if muted role couldn't be created
                message.channel.send('Couldn\'t find or create a `Muted` role');
                Bot.mStats.logMessageSend();
                return false;
            }

            // if member doesn't have the role yet
            if (!alreadyMuted)
                await member.addRole(muteRole, reason);

            // if the mute time was extended or if the member was muted
            if (!alreadyMuted) {
                createMute(message, member, reason, time, false);

                // dm to member that they has been muted
                member.send(`You were muted in **${message.guild.name}** for ${stringTime} ${reason ? 'because of following reason:\n' + reason : ''}`);
                Bot.mStats.logMessageSend();

                // send confirmation message
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`:white_check_mark: **${member.user.tag} has been muted for ${stringTime}${reason ? ', ' + reason : ''}**`);
                Bot.mStats.logCommandUsage(command.name, 'new');
                Bot.mStats.logMessageSend();
            } else {
                createMute(message, member, reason, time, true);

                // dm to member that they has been muted
                member.send(`You mute time was changed in **${message.guild.name}** to ${stringTime} ${reason ? 'because of following reason:\n' + reason : ''}`);
                Bot.mStats.logMessageSend();

                // send confirmation message
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`:white_check_mark: **${member.user.tag}'s mute time has been changed to ${stringTime}${reason ? ', ' + reason : ''}**`);
                Bot.mStats.logCommandUsage(command.name, 'changed');
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