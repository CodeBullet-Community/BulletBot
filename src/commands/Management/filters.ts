import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { commandsObject, LOG_TYPE_ADD, LOG_TYPE_REMOVE, filtersObject } from '../../database/schemas';

async function sendFilterList(guild: Guild, message: Message, strucObject: any, path: string, requestTimestamp: number) {
    var output = new RichEmbed();
    output.setAuthor('Filter List:', Bot.client.user.avatarURL);
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

    var filters = Object.keys(strucObject).filter(x => typeof (strucObject[x].embedHelp) != 'undefined');
    for (var i = 0; i < filters.length; i++) {
        var f = Bot.filters.get(filters[i]);
        output.addField((await Bot.database.getPrefix(guild)) + f.name, f.shortHelp);
    }
    Bot.mStats.logResponseTime(command.name, requestTimestamp);
    message.channel.send(output);
    Bot.mStats.logMessageSend();
    Bot.mStats.logCommandUsage(command.name, 'list');
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return;
        }
        var argsArray = args.split(' ').filter(x => x.length != 0);

        switch (argsArray[argIndex]) {
            case 'list':
                argIndex++;
                if (argsArray[argIndex] == 'enabled') {
                    var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);
                    if (!filtersDoc) {
                        Bot.mStats.logResponseTime(command.name, requestTimestamp);
                        message.channel.send('There aren\'t any enabled filters.');
                        Bot.mStats.logMessageSend();
                    } else {
                        var output = new RichEmbed();
                        output.setAuthor('Enabled Filters:', Bot.client.user.avatarURL);
                        output.setColor(Bot.database.settingsDB.cache.helpEmbedColor);

                        var filtersObject: filtersObject = filtersDoc.toObject();
                        for (const filterName in filtersObject.filters) {
                            if (!filtersObject.filters[filterName]._enabled) continue;
                            var cmd = Bot.filters.get(filterName);
                            output.addField(cmd.name, cmd.shortHelp);
                        }

                        Bot.mStats.logResponseTime(command.name, requestTimestamp);
                        if (output.fields.length == 0) {
                            message.channel.send('There aren\'t any enabled filters.');
                        } else {
                            message.channel.send(output);
                        }
                        Bot.mStats.logCommandUsage(command.name, 'listEnabled');
                        Bot.mStats.logMessageSend();
                        return
                    }
                }

                var strucObject = Bot.filters.structure;
                if (argsArray[argIndex]) {
                    var keys = args.split('/');
                    for (var i = 0; i < keys.length; i++) {
                        if (typeof (strucObject[keys[i]]) === 'undefined') {
                            message.channel.send('Couldn\'t find ' + args + ' category');
                            Bot.mStats.logMessageSend();
                            return;
                        } else {
                            strucObject = strucObject[keys[i]];
                        }
                    }
                }
                sendFilterList(message.guild, message, strucObject, args.slice(4), requestTimestamp);
                break;
            case 'enable':
                argIndex++;
                if (!argsArray[argIndex]) {
                    message.channel.send('Please input a filter');
                    Bot.mStats.logMessageSend();
                    return;
                }
                var filter = Bot.filters.get(argsArray[argIndex].toLowerCase());
                if (!filter) {
                    message.channel.send(`\`${argsArray[argIndex].toLowerCase()}\` isn't a filter.`);
                    Bot.mStats.logMessageSend();
                    return;
                }

                var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);
                var filterSettings = await Bot.database.getFilterSettings(message.guild.id, filter.name, filtersDoc);
                if (filterSettings) {
                    if (filterSettings._enabled) {
                        Bot.mStats.logResponseTime(command.name, requestTimestamp);
                        message.channel.send(`The \`${filter.name}\` filter is already enabled.`);
                        Bot.mStats.logMessageSend();
                        return;
                    }
                } else {
                    filterSettings = {};
                }

                filterSettings._enabled = true;
                Bot.database.setFilterSettings(message.guild.id, filter.name, filterSettings, filtersDoc);
                Bot.mStats.logResponseTime(command.name, requestTimestamp);
                message.channel.send(`Succesfully enabled the \`${filter.name}\` filter.`);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'enable');
                Bot.logger.logFilter(message.guild, message.member, filter, LOG_TYPE_ADD);
                break;
            case 'disable':
                argIndex++;
                if (!argsArray[argIndex]) {
                    message.channel.send('Please input a filter');
                    Bot.mStats.logMessageSend();
                    return;
                }
                var filter = Bot.filters.get(argsArray[argIndex].toLowerCase());
                if (!filter) {
                    message.channel.send(`\`${argsArray[argIndex].toLowerCase()}\` isn't a filter.`);
                    Bot.mStats.logMessageSend();
                    return;
                }

                var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);
                var filterSettings = await Bot.database.getFilterSettings(message.guild.id, filter.name, filtersDoc);
                if (!filterSettings || !filterSettings._enabled) {
                    Bot.mStats.logResponseTime(filter.name, requestTimestamp);
                    message.channel.send(`The \`${filter.name}\` filter is already disabled.`);
                    Bot.mStats.logMessageSend();
                    return;
                }

                filterSettings._enabled = false;
                Bot.database.setFilterSettings(message.guild.id, filter.name, filterSettings, filtersDoc);
                Bot.mStats.logResponseTime(command.name, requestTimestamp);
                message.channel.send(`Succesfully disabled the \`${filter.name}\` filter.`);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'disable');
                Bot.logger.logFilter(message.guild, message.member, filter, LOG_TYPE_REMOVE);
                break;
            default:
                if (!argsArray[argIndex]) {
                    message.channel.send('Filter name isn\'t given');
                    Bot.mStats.logMessageSend();
                    return;
                }
                var filter = Bot.filters.get(argsArray[argIndex]);
                if (!filter) {
                    message.channel.send(argsArray[argIndex] + ' isn\'t a filter');
                    Bot.mStats.logMessageSend();
                    return;
                }

                Bot.mStats.logResponseTime(command.name, requestTimestamp);
                message.channel.send(await filter.embedHelp(message.guild));
                Bot.mStats.logCommandUsage(command.name, 'help');
                Bot.mStats.logMessageSend();
        }

    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'filters';
command.path = '';
command.dm = false;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'Let\'s you toggle filters';
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
                    'value': 'Let\'s you toggle filters'
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
                    'value': '{command} list\n{command} list [command name/category]\nuse `category/subcategory` to get list from subcategory\n{command} list enabled\n{command} disable [command]\n{command} enable [command]'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} list\n{command} list Fun\n{command} list enabled\n{command} disable animal\n{command} enable animal'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;