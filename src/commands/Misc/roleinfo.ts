import { Message, RichEmbed, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToMember, stringToRole } from '../../utils/parsers';
import { getDayDiff, timeFormat } from '../../utils/time';
import dateFormat = require('dateformat');

var command: commandInterface = {
    name: 'roleinfo',
    path: '',
    dm: false,
    permLevel: permLevels.member,
    togglable: false,
    help: {
        shortDescription: 'gives a description of a role',
        longDescription: 'gives a description of a role',
        usages: [
            '{command} [role]'
        ],
        examples: [
            '{command} admin'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {

            if (args.length === 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            // get role which to return info of
            var infoRole = stringToRole(message.guild, args);

            // check if role is either @here or @everyone
            if (!infoRole || infoRole == '@here' || infoRole == '@everyone') {
                message.channel.send(`${args.replace('@', ' ')} is not a valid role!`);
                Bot.mStats.logMessageSend();
                return false;
            }

            // get role embed and send it
            let roleEmbed = createRoleEmbed(infoRole, message.guild);
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(roleEmbed);
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

/**
 * creates a rich embed with info about a role
 *
 * @param {*} infoRole role
 * @param {*} guild guild of role
 * @returns
 */
function createRoleEmbed(infoRole, guild) {
    let date = new Date();
    guild.fetchMembers();
    return {
        "embed": {
            "author": { "name": `Description of ${infoRole.name}` },
            "footer": { "text": `ID: ${infoRole.id}` },
            "color": infoRole.color,
            "timestamp": date.toISOString(),
            "fields": [
                {
                    "name": "Created",
                    "value": `${dateFormat(infoRole.createdAt, timeFormat)} \n (${getDayDiff(infoRole.createdAt, date.getTime())} days ago)`,
                    "inline": true
                },
                {
                    "name": "Color",
                    "value": `${infoRole.color} ([${infoRole.hexColor}](https://www.color-hex.com/color/${infoRole.hexColor.slice(1)}))`,
                    "inline": true
                },
                {
                    "name": 'Hoisted',
                    "value": infoRole.hoist,
                    "inline": true
                },
                {
                    "name": "Mentionable",
                    "value": infoRole.mentionable,
                    "inline": true
                },
                {
                    "name": "Members",
                    "value": infoRole.members.size,
                    "inline": true
                },
                {
                    "name": "Position",
                    "value": infoRole.calculatedPosition,
                    "inline": true
                },
                {
                    "name": "Permissions",
                    "value": infoRole.permissions,
                    "inline": true
                },
            ]
        }
    };
}

export default command;
