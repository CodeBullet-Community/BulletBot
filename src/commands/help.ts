import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';

/**
 * sends a list of commands with their short description
 *
 * @param {Guild} guild guild to get the prefix from
 * @param {Message} message message it should reply to
 * @param {*} strucObject structure Object with commands and subcategories it should list
 * @param {string} path the path to that structure Object
 * @param {[number, number]} requestTime when the list was requested to measure response time
 */
async function sendCommandList(guild: Guild, message: Message, strucObject: any, path: string, requestTime: [number, number]) {
    // create embed and set basic information
    var output = new RichEmbed();
    output.setAuthor('Command List:', Bot.client.user.displayAvatarURL);
    if (path) output.setFooter('Path: ~' + path);
    output.setColor(Bot.database.settingsDB.cache.embedColors.help);

    // list subcategories
    var categories = Object.keys(strucObject).filter(x => strucObject[x]._categoryName);
    if (categories.length != 0) {
        var cat_text = strucObject[categories[0]]._categoryName;
        for (i = 1; i < categories.length; i++) {
            cat_text += '\n' + strucObject[categories[i]]._categoryName;
        }
        output.addField('Subcategories:', cat_text);
    }

    // list commands
    var commands = Object.keys(strucObject).filter(x => strucObject[x].help);
    for (var i = 0; i < commands.length; i++) {
        var f = Bot.commands.get(commands[i]);
        if (f.permLevel == permLevels.botMaster) continue; // ignores commands only for bot masters
        output.addField((await Bot.database.getPrefix(guild)) + f.name, f.help.shortDescription);
    }

    // send embed
    Bot.mStats.logResponseTime(command.name, requestTime);
    message.channel.send(output);
    Bot.mStats.logMessageSend();
    Bot.mStats.logCommandUsage(command.name, 'commandList');
}

var command: commandInterface = {
    name: 'help',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: false,
    help: {
        shortDescription: 'Gives a command list and help',
        longDescription: 'Lists all commands/categories and can get detailed help for command',
        usages: [
            '{command}',
            '{command} [command name/category]\nuse `category/subcategory` to get list from subcategory'
        ],
        examples: [
            '{command}',
            '{command} whois'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) {
                sendCommandList(message.guild, message, Bot.commands.structure, undefined, requestTime);
                return false;
            }

            var command = Bot.commands.get(args.toLowerCase());
            if (command == undefined) { // if it can't find the command search if it is a subcategory
                if (typeof (Bot.commands.structure[args.split('/')[0].toLowerCase()]) != 'undefined') {
                    var strucObject = Bot.commands.structure;
                    var keys = args.split('/');
                    for (var i = 0; i < keys.length; i++) {
                        if (typeof (strucObject[keys[i].toLowerCase()]) === 'undefined') {
                            message.channel.send('Couldn\'t find specified category');
                            Bot.mStats.logMessageSend();
                            return false;
                        } else {
                            strucObject = strucObject[keys[i].toLowerCase()];
                        }
                    }
                    sendCommandList(message.guild, message, strucObject, args, requestTime);
                    return false;
                } else {
                    message.channel.send('Couldn\'t find specified command');
                    Bot.mStats.logMessageSend();
                    return false;
                }
            }
            // if it found the command, respond with the help embed of the message
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
            Bot.mStats.logMessageSend();
            Bot.mStats.logCommandUsage('help', 'commandHelp');
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;