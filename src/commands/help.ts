import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels} from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';

async function sendCommandList(guild: Guild, message: Message, strucObject: any, path: string, requestTime: [number,number]) {
    var output = new RichEmbed();
    output.setAuthor('Command List:', Bot.client.user.avatarURL);
    if (path) output.setFooter('Path: ~' + path);
    output.setColor(Bot.database.settingsDB.cache.helpEmbedColor);
    var categories = Object.keys(strucObject).filter(x => typeof (strucObject[x].embedHelp) === 'undefined');
    if (categories.length != 0) {
        var cat_text = categories[0];
        for (i = 1; i < categories.length; i++) {
            cat_text += '\n' + categories[i]
        }
        output.addField('Subcategories:', cat_text);
    }

    var commands = Object.keys(strucObject).filter(x => typeof (strucObject[x].embedHelp) != 'undefined');
    for (var i = 0; i < commands.length; i++) {
        var f = Bot.commands.get(commands[i]);
        if (f.permLevel == permLevels.botMaster) continue;
        output.addField((await Bot.database.getPrefix(guild)) + f.name, f.shortHelp);
    }
    Bot.mStats.logResponseTime(command.name, requestTime);
    message.channel.send(output);
    Bot.mStats.logMessageSend();
    Bot.mStats.logCommandUsage(command.name, 'commandList');
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number,number]) => {
    try {
        if (args.length == 0) {
            sendCommandList(message.guild, message, Bot.commands.structure, undefined, requestTime);
            return false;
        }
        var command = Bot.commands.get(args.toLowerCase());
        if (command == undefined) {
            if (typeof (Bot.commands.structure[args.split('/')[0]]) != 'undefined') {
                var strucObject = Bot.commands.structure;
                var keys = args.split('/');
                for (var i = 0; i < keys.length; i++) {
                    if (typeof (strucObject[keys[i]]) === 'undefined') {
                        message.channel.send('Couldn\'t find ' + args + ' category');
                        Bot.mStats.logMessageSend();
                        return false;
                    } else {
                        strucObject = strucObject[keys[i]];
                    }
                }
                sendCommandList(message.guild, message, strucObject, args, requestTime);
                return false;
            } else {
                message.channel.send('Couldn\'t find ' + args.toLowerCase() + ' command');
                Bot.mStats.logMessageSend();
                return false;
            }
        }
        Bot.mStats.logResponseTime(command.name, requestTime);
        message.channel.send(await command.embedHelp(message.guild));
        Bot.mStats.logMessageSend();
        Bot.mStats.logCommandUsage('help', 'commandHelp');
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'help';
command.path = '';
command.dm = true;
command.permLevel = permLevels.member;
command.togglable = false;
command.shortHelp = 'gives a command list and help';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.helpEmbedColor,
            'author': {
                'name': 'Command: ' + prefix + command.name
            },
            'fields': [
                {
                    'name': 'Description:',
                    'value': 'lists all commands/categories and can get detailed help for command'
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
                    'name': 'Usage:',
                    'value': '{command}\n{command} [command name/category]\nuse `category/subcategory` to get list from subcategory'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command}\n{command} mention'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;