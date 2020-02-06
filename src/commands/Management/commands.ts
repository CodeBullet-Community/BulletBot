import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permLevels } from '../../utils/permissions';
import { logTypes } from '../../database/schemas';
import { GuildWrapper } from '../../database/guildWrapper';

function getCommandList(guildWrapper: GuildWrapper, title: string, criteria: (command: commandInterface) => boolean) {
    let embed = new RichEmbed();
    embed.setAuthor(title, Bot.client.user.displayAvatarURL);
    embed.setColor(Bot.settings.embedColors.help);

    let commands = Bot.commands.commands.filter(criteria);
    for (const command of commands.array())
        embed.addField(guildWrapper.getPrefix() + command.name, command.help.shortDescription);
    if (!commands.size)
        embed.setDescription('*No commands*');

    return embed;
}

var command: commandInterface = {
    name: 'commands',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'Let\'s you toggle commands',
        longDescription: 'Let\'s you disable and enable commands',
        usages: [
            '{command} list',
            '{command} list [command name/category]\nuse `category/subcategory` to get list from subcategory',
            '{command} list disabled',
            '{command} list enabled',
            '{command} disable [command]',
            '{command} enable [command]'
        ],
        examples: [
            '{command} list',
            '{command} list Fun',
            '{command} list disabled',
            '{command} list enabled',
            '{command} disable animal',
            '{command} enable animal'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, guildWrapper, requestTime: [number, number]) => {
        try {
            var argIndex = 0;
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return;
            }
            var argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces
            
            if (argsArray[argIndex] == 'list') {
                argIndex++;
                if (argsArray[argIndex] != 'disabled' && argsArray[argIndex] != 'enabled')
                    // if it should just list all commands it just calls the help command
                    return await Bot.commands.get('help').run(message, argsArray[argIndex] ? argsArray[argIndex] : '', permLevel, dm, guildWrapper, requestTime);

                let criteria: (command: commandInterface) => boolean;
                if (argsArray[argIndex] == 'disabled')
                    criteria = (command) => command.togglable && !guildWrapper.commandIsEnabled(command.name);
                else
                    criteria = (command) => command.togglable && guildWrapper.commandIsEnabled(command.name);

                let title = argsArray[argIndex] == 'disabled' ? 'Disabled Commands' : 'Enabled Commands';
                let embed = getCommandList(guildWrapper, title, criteria);

                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(embed);
                Bot.mStats.logCommandUsage(command.name, 'listDisabled');
                Bot.mStats.logMessageSend();
                return true;
            }

            let enable = argsArray[argIndex] == 'enable';
            if (!enable && argsArray[argIndex] != 'disable') {
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`Please use one of the following options: \`list\`, \`disable\` or \`enable\``);
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            if (!argsArray[argIndex]) { // check if command is specified
                message.channel.send('Please input a command');
                Bot.mStats.logMessageSend();
                return false;
            }
            var cmd = Bot.commands.get(argsArray[argIndex].toLowerCase());
            if (!cmd) { // check if command exists
                message.channel.send(`That isn't a command.`);
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!cmd.togglable) { // check if command can be disabled
                message.channel.send(`That command isn't togglable.`);
                Bot.mStats.logMessageSend();
                return false;
            }

            // check if it's already enabled
            if (guildWrapper.commandIsEnabled(cmd.name) == enable) {
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`The ${cmd.name} command is already ${enable ? 'enabled' : 'disabled'}`);
                Bot.mStats.logMessageSend();
                return false;
            }

            // enable command
            await guildWrapper.toggleCommand(cmd.name, enable);

            // send message that it was successfully enabled
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`Successfully ${enable ? 'enabled' : 'disabled'} the \`${cmd.name}\` command`);
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage(command.name, enable ? 'enable' : 'disable');
            // log that command was enabled
            Bot.logger.logCommand(guildWrapper, message.member, cmd, enable ? logTypes.add : logTypes.remove);
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;