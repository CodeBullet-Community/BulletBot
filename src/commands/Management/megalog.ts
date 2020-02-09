import { Message, Guild, TextChannel, RichEmbed } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { megalogGroups, logTypes, MegalogFunction } from '../../database/schemas';
import { GuildWrapper } from '../../database/guildWrapper';

async function createMegalogInfoEmbed(guildWrapper: GuildWrapper) {
    let embed = new RichEmbed();
    embed.setColor(Bot.settings.embedColors.default);
    embed.setTimestamp(Date.now());
    embed.setAuthor('Megalog Settings');

    let enabledText = '';
    let disabledText = '';
    for (const func of megalogGroups.all) {
        let channelId = await guildWrapper.getMegalogChannelID(func);
        if (!channelId)
            disabledText += `${func}\n`;
        else
            enabledText += `${func}: <#${channelId}>\n`;
    }
    embed.addField('Enabled Functions', enabledText || '*No functions*', true);
    embed.addField('Disabled Functions', disabledText || '*No functions*', true);

    let ignoredText = (await guildWrapper.getMegalogIgnoreChannelIDs()).map(id => `<#${id}>`).join('\n');
    embed.addField('Ignored Channels', ignoredText || '*No ignored channels*', true);
    return embed;
}

async function toggleMegalogFunction(message: Message, guildWrapper: GuildWrapper, requestTime: [number, number], argsArray: string[], argIndex: number) {
    let functionArg = argsArray[argIndex + 1]
    let functions: MegalogFunction[] = megalogGroups[functionArg];
    // @ts-ignore
    if (!functions && megalogGroups.all.includes(functionArg))  // when the argument wasn't a category but a single function
        // @ts-ignore
        functions = [functionArg];
    if (!functions) { // if nor a single function or a category was found
        message.channel.send('The specified group/function doesn\'t exist');
        Bot.mStats.logMessageSend();
        return false;
    }

    let enable = argsArray[argIndex] == 'enable';
    if (enable) {
        argIndex += 2;
        var channel = stringToChannel(message.guild, argsArray[argIndex]);
        if (!channel) { // check if specified channel was found
            message.channel.send('Couldn\'t find the specified channel');
            Bot.mStats.logMessageSend();
            return false;
        }
        if (!(channel instanceof TextChannel)) { // check if the channel is a text channel
            message.channel.send('The specified channel isn\'t a text channel');
            Bot.mStats.logMessageSend();
            return false;
        }
    }

    let changedFunctions: MegalogFunction[] = [];
    for (const func of functions) {
        let result;
        if (enable)
            result = await guildWrapper.setMegalogChannel(func, channel);
        else
            result = await guildWrapper.disableMegalogFunction(func);
        if (!result) continue;
        changedFunctions.push(func);
    }

    if (changedFunctions.length == 0) { // if no functions were enabled
        Bot.mStats.logResponseTime(command.name, requestTime);
        message.channel.send(`No functions were changed`);
        Bot.mStats.logMessageSend();
        Bot.mStats.logCommandUsage(command.name, enable ? 'enable' : 'disable');
        return true;
    }

    // log that the functions have been enabled
    await Bot.logger.logMegalog(message.guild, message.member, enable ? logTypes.add : logTypes.remove, changedFunctions, channel);

    // send confirmation message
    Bot.mStats.logResponseTime(command.name, requestTime);
    message.channel.send(`Successfully ${enable ? 'enabled' : 'disabled'} ${changedFunctions.map(v => `**${v}**`).join(', ')} function${changedFunctions.length == 1 ? '' : 's'} ${enable ? `to ${channel}` : ''}`);
    Bot.mStats.logCommandUsage(command.name, 'enable');
    Bot.mStats.logMessageSend();
    return true;
}

async function toggleMegalogIgnore(message: Message, guildWrapper: GuildWrapper, requestTime: [number, number], argsArray: string[], argIndex: number) {
    let ignore = argsArray[argIndex] == 'ignore';
    argIndex++;

    let channel = stringToChannel(message.guild, argsArray[argIndex]);
    if (!channel) { // check if specified channel was found
        message.channel.send('Couldn\'t find the specified channel');
        Bot.mStats.logMessageSend();
        return false;
    }
    if (!(channel instanceof TextChannel)) { // check if the channel is a text channel
        message.channel.send('The specified channel isn\'t a text channel');
        Bot.mStats.logMessageSend();
        return false;
    }

    let result = await (ignore ? guildWrapper.addMegalogIgnoreChannel(channel) : guildWrapper.removeMegalogIgnoreChannel(channel));

    if (result)
        Bot.logger.logMegalogIgnore(message.guild, message.member, ignore ? logTypes.add : logTypes.remove, channel);

    // send confirmation message
    Bot.mStats.logResponseTime(command.name, requestTime);
    if (result)
        message.channel.send(`Successfully ${ignore ? 'added' : 'removed'} ${channel} ${ignore ? 'to' : 'from'} the ignored channels`);
    else
        message.channel.send(`The specified channel already is${ignore ? '' : `n't`} in the ignore channel list`);
    Bot.mStats.logMessageSend();
    Bot.mStats.logCommandUsage(command.name, ignore ? 'ignore' : 'unignore');
}

var command: commandInterface = {
    name: 'megalog',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'let\'s you change megalog settings',
        longDescription: 'Let\'s you enable and disable megalog functions.\nThe megalogger is divided in functions. Each function logs certain events. To make it easier to enable several at once, the functions are also grouped.\nYou can enable functions separately or use the groups to enable several at once.\nYou can also make the megalogger ignore certain channels.',
        usages: [
            '{command} info',
            '{command} enable [group/function] [channel]',
            '{command} disable [group/function]',
            '{command} ignore [channel]',
            '{command} unignore [channel]'
        ],
        examples: [
            '{command} info',
            '{command} enable channelCreate #channelCreates',
            '{command} enable messages #message-logs',
            '{command} disable channelCreate',
            '{command} ignore #admin-chat',
            '{command} unignore #admin-chat'
        ],
        additionalFields: [
            {
                'name': 'Groups:',
                'value': Object.keys(megalogGroups).join(', ')
            },
            {
                'name': 'Functions:',
                'value': megalogGroups.all.join(', ')
            }
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            if (argsArray[argIndex] == 'info') {
                let embed = await createMegalogInfoEmbed(guildWrapper);
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(embed);
                Bot.mStats.logCommandUsage(command.name, 'info');
                Bot.mStats.logMessageSend();
                return true;
            }

            if (argsArray[argIndex] == 'enable' || argsArray[argIndex] == 'disable')
                return await toggleMegalogFunction(message, guildWrapper, requestTime, argsArray, argIndex);

            if (argsArray[argIndex] == 'ignore' || argsArray[argIndex] == 'unignore')
                return await toggleMegalogIgnore(message, guildWrapper, requestTime, argsArray, argIndex);

            // if action doesn't exist
            message.channel.send('Unknown action. Use `info`, `enable`, `disable`, `ignore` or `unignore`');
            Bot.mStats.logMessageSend();
            return false;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;