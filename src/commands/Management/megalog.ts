import { Message, Guild, TextChannel } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { megalogFunctions, logTypes, megalogObject } from '../../database/schemas';

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
            '{command} list',
            '{command} enable [group/function] [channel]',
            '{command} disable [group/function]',
            '{command} ignore [channel]',
            '{command} unignore [channel]'
        ],
        examples: [
            '{command} list',
            '{command} enable channelCreate #channelCreates',
            '{command} enable messages #message-logs',
            '{command} disable channelCreate',
            '{command} ignore #admin-chat',
            '{command} unignore #admin-chat'
        ],
        additionalFields: [
            {
                'name': 'Groups:',
                'value': Object.keys(megalogFunctions).join(', ')
            },
            {
                'name': 'Functions:',
                'value': megalogFunctions.all.join(', ')
            }
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces
            let megalogDoc = await Bot.database.getMegalogDoc(message.guild.id);
            switch (argsArray[argIndex]) { // the different actions
                case 'list':
                    {
                        // load all functions and their channels into a string
                        let functionsText = '';
                        let megalogObject: megalogObject = megalogDoc.toObject();
                        for (const func in megalogObject) {
                            if (megalogFunctions.all.includes(func)) {
                                functionsText += `${func}: ${message.guild.channels.get(megalogObject[func])}\n`;
                            }
                        }

                        // send embed
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send({
                            "embed": {
                                "color": Bot.settings.embedColors.default,
                                "timestamp": new Date().toISOString(),
                                "author": {
                                    "name": "Megalog Settings"
                                },
                                "fields": [
                                    {
                                        "name": "Enabled Functions",
                                        "value": functionsText.length ? functionsText : 'No functions active',
                                        "inline": true
                                    },
                                    {
                                        "name": "Ignored Channels",
                                        "value": megalogObject.ignoreChannels && megalogObject.ignoreChannels.length ? '<#' + megalogObject.ignoreChannels.join('>\n<#') + '>' : '*No ignored channels*',
                                        "inline": true
                                    }
                                ]
                            }
                        });
                        Bot.mStats.logCommandUsage(command.name, 'list');
                        Bot.mStats.logMessageSend();
                        break;
                    }
                case 'enable':
                case 'disable':
                    let functions = megalogFunctions[argsArray[argIndex + 1]];
                    if (!functions || megalogFunctions.all.includes(argsArray[argIndex + 1])) { // when the argument wasn't a category but a single function
                        functions = [argsArray[argIndex + 1]];
                    }
                    if (!functions || !functions[0]) { // if nor a single function or a category was found
                        message.channel.send('The specified group/function doesn\'t exist');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    switch (argsArray[argIndex]) {
                        case 'enable':
                            {
                                argIndex += 2;
                                let channel = stringToChannel(message.guild, argsArray[argIndex]);
                                if (!channel) { // check if specified channel was found
                                    message.channel.send('Coudn\'t find specified channel');
                                    Bot.mStats.logMessageSend();
                                    return false;
                                }
                                if (!(channel instanceof TextChannel)) { // check if the channel is a text channel
                                    message.channel.send('Specified channel isn\'t a text channel');
                                    Bot.mStats.logMessageSend();
                                    return false;
                                }

                                let text = ''; // string containing all enabled functions
                                let enabledFunctions: string[] = []; // list of enabled functions
                                for (const func of functions) {
                                    if (megalogDoc[func] == channel.id) continue; // skip over those already toggled
                                    enabledFunctions.push(func);
                                    megalogDoc[func] = channel.id;
                                    text += '**' + func + '**, ';
                                }

                                if (enabledFunctions.length == 0) { // if no functions were enabled
                                    Bot.mStats.logResponseTime(command.name, requestTime);
                                    message.channel.send(`No functions were changed`);
                                    Bot.mStats.logMessageSend();
                                    Bot.mStats.logCommandUsage(command.name, 'enable');
                                    return true;
                                }

                                // save changes to database
                                await megalogDoc.save();
                                // log that the functions have been enabled
                                await Bot.logger.logMegalog(message.guild, message.member, logTypes.add, enabledFunctions, channel);

                                // send confirmation message
                                text = text.slice(0, -2); // cut of ", " at the end
                                Bot.mStats.logResponseTime(command.name, requestTime);
                                message.channel.send(`Successfully enabled function(-s) ${text} in ${channel}`);
                                Bot.mStats.logCommandUsage(command.name, 'enable');
                                Bot.mStats.logMessageSend();
                                break;
                            }
                        case 'disable':
                            {
                                let text = ''; // string containing all disabled functions
                                let disabledFunctions: string[] = []; // list of disabled functions
                                for (const func of functions) {
                                    if (!megalogDoc[func]) continue; // skip over those already undefined
                                    disabledFunctions.push(func);
                                    megalogDoc[func] = undefined;
                                    text += '**' + func + '**, ';
                                }

                                if (disabledFunctions.length == 0) { // if no functions were disabled
                                    Bot.mStats.logResponseTime(command.name, requestTime);
                                    message.channel.send(`No functions were changed`);
                                    Bot.mStats.logMessageSend();
                                    Bot.mStats.logCommandUsage(command.name, 'disable');
                                    return true;
                                }

                                // save changes to database
                                await megalogDoc.save();
                                // log that the functions have been disabled
                                await Bot.logger.logMegalog(message.guild, message.member, logTypes.remove, disabledFunctions);

                                // send confirmation message
                                text = text.slice(0, -2); // cut of ", " at the end
                                Bot.mStats.logResponseTime(command.name, requestTime);
                                message.channel.send(`Successfully disabled function(-s) ${text}`);
                                Bot.mStats.logCommandUsage(command.name, 'disable');
                                Bot.mStats.logMessageSend();
                                break;
                            }
                    }
                    break;
                case 'ignore':
                case 'unignore':
                    let channel = stringToChannel(message.guild, argsArray[argIndex + 1]);
                    if (!channel) { // check if specified channel was found
                        message.channel.send('Coudn\'t find specified channel');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    if (!(channel instanceof TextChannel)) { // check if the channel is a text channel
                        message.channel.send('Specified channel isn\'t a text channel');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    switch (argsArray[argIndex]) {
                        case 'ignore':
                            {
                                if (!megalogDoc.ignoreChannels) megalogDoc.ignoreChannels = []; // if the property hasn't been added yet
                                // add channel to ignore list if it isn't already ignored else send fail message
                                if (!megalogDoc.ignoreChannels.includes(channel.id)) {
                                    megalogDoc.ignoreChannels.push(channel.id);
                                } else {
                                    message.channel.send('The specified channel is already being ignored');
                                    Bot.mStats.logMessageSend();
                                    return false;
                                }
                                // save changes
                                await megalogDoc.save();
                                // log that the channel has been ignored
                                Bot.logger.logMegalogIgnore(message.guild, message.member, logTypes.add, channel);

                                // send confirmation message
                                Bot.mStats.logResponseTime(command.name, requestTime);
                                message.channel.send(`Successfully added ${channel} to the ignored channels`);
                                Bot.mStats.logCommandUsage(command.name, 'ignore');
                                Bot.mStats.logMessageSend();
                                break;
                            }
                        case 'unignore':
                            {
                                // remove channel from ignore list if it is in there else send fail message
                                if (megalogDoc.ignoreChannels && megalogDoc.ignoreChannels.includes(channel.id)) {
                                    megalogDoc.ignoreChannels.splice(megalogDoc.ignoreChannels.indexOf(channel.id), 1);
                                } else {
                                    message.channel.send('The specified channel isn\'t currently being ignored');
                                    Bot.mStats.logMessageSend();
                                    return false;
                                }
                                // save changes
                                await megalogDoc.save();
                                // log that the channel has be unignored
                                Bot.logger.logMegalogIgnore(message.guild, message.member, logTypes.remove, channel);

                                // send confirmation message
                                Bot.mStats.logResponseTime(command.name, requestTime);
                                message.channel.send(`Successfully removed ${channel} from the ignored channels`);
                                Bot.mStats.logCommandUsage(command.name, 'unignore');
                                Bot.mStats.logMessageSend();
                                break;
                            }
                    }
                    break;
                default:
                    // if action doesn't exist
                    message.channel.send('unknown action. Use list, enable, disable, ignore or unignore');
                    Bot.mStats.logMessageSend();
                    return false;
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