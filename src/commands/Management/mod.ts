import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { PermLevels } from '../../utils/permissions';

var command: commandInterface = {
    name: 'mod',
    path: '',
    dm: false,
    permLevel: PermLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'for managing the mod rank',
        longDescription: 'let\'s you add, remove and list mod roles and users',
        usages: [
            '{command} add [role/user]',
            '{command} rem [role/user]',
            '{command} list'
        ],
        examples: [
            '{command} add @mods',
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
            let result = await Bot.commands.runCommand(message, `mods ${args}`, 'staff', permLevel, dm, guildWrapper, requestTime);
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