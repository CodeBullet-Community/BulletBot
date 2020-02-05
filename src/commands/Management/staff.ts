import { Message, Guild, GuildMember, Role, Snowflake } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToRole, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { guildRanks, GuildRank } from '../../database/schemas';
import { GuildWrapper } from '../../database/guildWrapper';
import { logTypes } from '../../database/schemas';

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function listRank(guildWrapper: GuildWrapper, rank: GuildRank) {
    let roles = guildWrapper.getRankRoleIDs(rank).map(id => `<@&${id}>`);
    let users = guildWrapper.getRankMemberIDs(rank).map(id => `<@${id}>`);
    return {
        'embed': {
            'color': Bot.settings.embedColors.default,
            'timestamp': new Date().toISOString(),
            'author': {
                'name': `${capitalizeFirstLetter(rank)}:`
            },
            'fields': [
                {
                    'name': 'Roles:',
                    'value': roles.length ? roles.join('\n') : '*No Roles*',
                    'inline': true
                },
                {
                    'name': 'Users:',
                    'value': users.length ? users.join('\n') : '*No Roles*',
                    'inline': true
                }
            ]
        }
    };
}

async function getUserRole(message: Message, text: string) {
    let role = stringToRole(message.guild, text, true, false);
    if (typeof (role) == 'string') {
        message.channel.send('You can\'t add everyone or here to a rank.');
        Bot.mStats.logMessageSend();
        return undefined;
    }
    if (role) return { id: role.id, name: role.name, isRole: true };

    let member = await stringToMember(message.guild, text, true, true, false);
    if (member) return { id: member.id, name: member.displayName, isRole: false };

    message.channel.send('There isn\'t a role or user called that way');
    Bot.mStats.logMessageSend();
    return undefined;
}

async function logOperation(guild: Guild, requester: GuildMember, logType: 0 | 1, rank: GuildRank, snowflake: Snowflake, isRole: boolean) {
    let role = isRole ? guild.roles.get(snowflake) : undefined;
    let user = isRole ? undefined : await Bot.client.fetchUser(snowflake);
    Bot.logger.logStaff(guild, requester, logType, rank, role, user);
}

let command: commandInterface = {
    name: 'staff',
    path: '',
    dm: false,
    permLevel: permLevels.botMaster,
    togglable: false,
    help: {
        shortDescription: '-',
        longDescription: '-',
        usages: [],
        examples: []
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime, commandCache?) => {
        try {
            if (args.length == 0) {
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0);

            // @ts-ignore
            let rank: GuildRank = argsArray[argIndex];
            if (!guildRanks.includes(rank)) {
                message.channel.send('The provided rank does not exist');
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            if (!argsArray[argIndex] ||
                !['list', 'add', 'rem'].includes(argsArray[argIndex])) {
                message.channel.send('Please specify one of the following actions: `list`, `add` or `rem`');
                Bot.mStats.logMessageSend();
                return false;
            }

            if (argsArray[argIndex] == 'list') {
                let embed = listRank(guildWrapper, rank);
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(embed);
                Bot.mStats.logMessageSend();
                return true;
            }

            argIndex++;
            if (!argsArray[argIndex]) { // check if user or role is given
                message.channel.send('Please provide a user or role.');
                Bot.mStats.logMessageSend();
                return false;
            }

            let lastArg = argsArray.slice(argIndex).join(' ');
            let snowflakeObj = await getUserRole(message, lastArg);
            if (!snowflakeObj) return false;

            let operation = argsArray[1] == 'add'; // if snowflake gets added or removed
            let result = operation ? await guildWrapper.addToRank('admins', snowflakeObj.id) : await guildWrapper.removeFromRank('admins', snowflakeObj.id);

            Bot.mStats.logResponseTime(command.name, requestTime);
            if (result) {
                message.channel.send(`Successfully added ${snowflakeObj.name} to the rank \`${rank}\``);
                // log the staff change
                await logOperation(message.guild, message.member, operation ? logTypes.add : logTypes.remove, rank, snowflakeObj.id, snowflakeObj.isRole);
            } else {
                message.channel.send(`${snowflakeObj.name} is already a in the rank \`${rank}\``);
            }
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