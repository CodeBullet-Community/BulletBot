import { Message, Guild, TextChannel } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';

const megalogFunctions = {
    all: [
        'channelCreate',
        'channelDelete',
        'channelUpdate',
        'ban',
        'unban',
        'memberJoin',
        'memberLeave',
        'nicknameChange',
        'memberRolesChange',
        'guildNameChange',
        'messageDelete',
        'attachmentCache',
        'messageEdit',
        'reactionAdd',
        'reactionRemove',
        'roleCreate',
        'roleDelete',
        'roleUpdate',
        'voiceTransfer',
        'voiceMute',
        'voiceDeaf'],
    channels: ['channelCreate',
        'channelDelete',
        'channelUpdate'],
    members: ['memberJoin',
        'memberLeave', 'memberRolesChange'],
    roles: ['roleCreate',
        'roleDelete',
        'roleUpdate'],
    voice: ['voiceTransfer',
        'voiceMute',
        'voiceDeaf'],
    messages: ['messageDelete',
        'attachmentCache',
        'messageEdit'],
    reactions: ['reactionAdd',
        'reactionRemove']
}

var command: commandInterface = {
    name: 'megalog',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    shortHelp: 'let\'s you change megalog settings', // very short desc of what the command does
    embedHelp: async function (guild: Guild) {
        var prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.embedColors.help,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': 'Let\'s you enable and disable megalog functions\nThe megalogger is divided in functions. Each function logs certain events. To make it easier to enable several at once, the functions are also grouped.\nYou can enable functions separately or use the groups to enable several at once.'
                    },
                    {
                        'name': 'Need to be:',
                        'value': permToString(command.permLevel),
                        'inline': true
                    },
                    {
                        'name': 'DM capable:',
                        'value': command.dm,
                        'inline': true
                    },
                    {
                        'name': 'Togglable:',
                        'value': command.togglable,
                        'inline': true
                    },
                    {
                        'name': 'Groups:',
                        'value': 'all, channels, members, roles, voice, messages, reactions'
                    },
                    {
                        'name': 'Functions:',
                        'value': 'channelCreate, channelDelete, channelUpdate, ban, unban, memberJoin, memberLeave, nicknameChange, memberRolesChange, guildNameChange,' +
                            ' messageDelete, attachmentCache, messageEdit, reactionAdd, reactionRemove, roleCreate, roleDelete, roleUpdate, voiceTranfer, voiceMute, voiceDeaf'
                    },
                    {
                        'name': 'Usage:',
                        'value': '{command} list\n{command} enable [group/function] [channel]\n{command} disable [group/function]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} list\n{command} enable channelCreate #channelCreates\n{command} enable messages #message-logs\n{command} disable channelCreate'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) {
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0);
            let megalogDoc = await Bot.database.findMegalogDoc(message.guild.id);
            let text = '';
            switch (argsArray[argIndex]) {
                case 'list':
                    let megalogObject = megalogDoc.toObject();
                    for (const func in megalogObject) {
                        if (megalogFunctions.all.includes(func)) {
                            text += `${func}: ${message.guild.channels.get(megalogObject[func])}\n`;
                        }
                    }
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send({
                        "embed": {
                            "description": text.length ? text : 'No functions active',
                            "color": Bot.database.settingsDB.cache.embedColors.default,
                            "timestamp": new Date().toISOString(),
                            "author": {
                                "name": "Enabled Megalog Functions"
                            }
                        }
                    });
                    Bot.mStats.logCommandUsage(command.name, 'list');
                    Bot.mStats.logMessageSend();
                    break;
                case 'enable':
                case 'disable':
                    let functions = megalogFunctions[argsArray[argIndex + 1]];
                    if (!functions) {
                        functions = [megalogFunctions.all[argsArray[argIndex + 1]]];
                    }
                    if (!functions || !functions.length) {
                        message.channel.send('The specified group/function doesn\'t exist');
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    switch (argsArray[argIndex]) {
                        case 'enable':
                            argIndex += 2;
                            let channel = stringToChannel(message.guild, argsArray[argIndex]);
                            if (!channel) {
                                message.channel.send('Coudn\'t find specified channel');
                                Bot.mStats.logMessageSend();
                                return false;
                            }
                            if (!(channel instanceof TextChannel)) {
                                message.channel.send('Specified channel isn\'t a text channel');
                                Bot.mStats.logMessageSend();
                                return false;
                            }

                            for (const func of functions) {
                                megalogDoc[func] = channel.id;
                                text += func + ', ';
                            }
                            await megalogDoc.save();
                            text = text.slice(0, -2);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`Successfully enabled function(-s) ${text} in ${channel}`);
                            Bot.mStats.logCommandUsage(command.name, 'enable');
                            Bot.mStats.logMessageSend();
                            break;
                        case 'disable':
                            for (const func of functions) {
                                megalogDoc[func] = undefined;
                                text += '**' + func + '**, ';
                            }
                            await megalogDoc.save();
                            text = text.slice(0, -2);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`Successfully disabled function(-s) ${text}`);
                            Bot.mStats.logCommandUsage(command.name, 'disable');
                            Bot.mStats.logMessageSend();
                            break;
                    }
                    break;
                default:
                    message.channel.send('unknown action. Use list, enable, disable');
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