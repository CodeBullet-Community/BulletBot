import { Message, RichEmbed, Guild, GuildMember, Role, MessageMentions } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel, stringToRole, stringToMember } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { logTypes } from '../../database/schemas';

var command: commandInterface = {
    name: 'immune',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'manage the immune rank',
        longDescription: 'let\'s you add, remove and list immune roles and users',
        usages: [
            '{command} add [role/user]',
            '{command} rem [role/user]',
            '{command} list'
        ],
        examples: [
            '{command} add @immune',
            '{command} rem @jeff#1234',
            '{command} list'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            if (args.length == 0) {
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let result = await Bot.commands.runCommand(message, `immune ${args}`, 'staff', permLevel, dm, guildWrapper, requestTime);
            if (!result) return false;
            let argsArray = args.split(' ');
            switch (argsArray[0]) {
                case 'list':
                    Bot.mStats.logCommandUsage(command.name, 'list');
                    break;
                case 'add':
                    Bot.mStats.logCommandUsage(command.name, 'add');
                    break;
                case 'add':
                    Bot.mStats.logCommandUsage(command.name, 'remove');
                    break;
                default:
            }
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;