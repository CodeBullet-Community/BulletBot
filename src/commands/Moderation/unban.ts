import { Message, Guild, Util } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString } from '../../utils/parsers';
import { durations } from '../../utils/time';

async function getBannedUser(guild: Guild, text: string) {
    let bans = await guild.fetchBans();
    let user = bans.find(x => x.id == text);
    if (!user) user = bans.find(x => x.username == text);
    return user;
}

var command: commandInterface = {
    name: 'unban',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    help: {
        shortDescription: 'Unban users',
        longDescription: 'Unban users',
        usages: [
            '{command} [user] [reason]'
        ],
        examples: [
            '{command} 418112403419430915 didn\'t steal my ice cream after all'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            let user = await getBannedUser(message.guild, argsArray[0]);
            if (!user) {  // check if it found the specified user
                message.channel.send('Couldn\'t find specified user');
                Bot.mStats.logMessageSend();
                return false;
            }

            // get the reason
            let reason = args.slice(args.indexOf(argsArray[0]) + argsArray[0].length).trim();
            // make a case
            Bot.caseLogger.logUnban(message.guild, user, message.member, reason);
            // dm to user that he has been unbanned
            user.send(`You were unbanned in **${message.guild.name}**${reason ? ' for:\n' + reason : ''}`).catch(error => { });

            // unban user
            message.guild.unban(user);
            // removed a pending unban if there was one
            Bot.pActions.removeBan(message.guild.id, user.id);

            // send confirmation message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **${user.tag} has been unbanned${reason ? ', ' + Util.escapeMarkdown(reason) : ''}**`);
            Bot.mStats.logCommandUsage(command.name);
            Bot.mStats.logMessageSend();
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;
