import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { logTypes, filtersObject } from '../../database/schemas';
import { GuildWrapper } from '../../database/guildWrapper';

/**
 * sends a list of filters with their short description
 *
 * @param {GuildWrapper} guildWrapper Guild to get the list for
 * @param {Message} message message it should reply to
 * @param {*} strucObject structure Object with filters and subcategories it should list
 * @param {string} path the path to that structure Object
 * @param {[number, number]} requestTime when the list was requested to measure response time
 */
async function sendFilterList(guildWrapper: GuildWrapper, message: Message, strucObject: any, path: string, requestTime: [number, number]) {
    var output = new RichEmbed();
    output.setAuthor('Filter List:', Bot.client.user.displayAvatarURL);
    if (path) output.setFooter('Path: ~' + path);
    output.setColor(Bot.settings.embedColors.help);
    var categories = Object.keys(strucObject).filter(x => strucObject[x]._categoryName);
    if (categories.length != 0) {
        var cat_text = strucObject[categories[0]]._categoryName;
        for (i = 1; i < categories.length; i++) {
            cat_text += '\n' + strucObject[categories[i]]._categoryName;
        }
        output.addField('Subcategories:', cat_text);
    }

    let prefix = guildWrapper.getPrefix();
    var filters = Object.keys(strucObject).filter(x => strucObject[x].shortHelp);
    for (var i = 0; i < filters.length; i++) {
        var f = Bot.filters.get(filters[i]);
        output.addField(prefix + f.name, f.shortHelp);
    }
    Bot.mStats.logResponseTime(command.name, requestTime);
    message.channel.send(output);
    Bot.mStats.logMessageSend();
    Bot.mStats.logCommandUsage(command.name, 'list');
}

var command: commandInterface = {
    name: 'filters',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'Let\'s you toggle filters',
        longDescription: 'Let\'s you enable and disable filters',
        usages: [
            '{command} list',
            '{command} list [filter name/category]\nuse `category/subcategory` to get list from subcategory',
            '{command} list enabled',
            '{command} disable [filter]',
            '{command} enable [command]'
        ],
        examples: [
            '{command} list',
            '{command} list BadWords',
            '{command} list enabled',
            '{command} disable kappa',
            '{command} enable kappa'
        ]
    },
    run: async (message, args, permLevel, dm, guildWrapper, requestTime) => {
        try {
            var argIndex = 0;
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            var argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces

            switch (argsArray[argIndex]) { // the different actions
                case 'list':
                    argIndex++;
                    if (argsArray[argIndex] == 'enabled') { // if it should only show enabled filters
                        var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);
                        if (!filtersDoc) { // if the filters doc doesn't exist, no command can be enabled
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send('There aren\'t any enabled filters.');
                            Bot.mStats.logMessageSend();
                        } else {
                            // build embed
                            var output = new RichEmbed();
                            output.setAuthor('Enabled Filters:', Bot.client.user.displayAvatarURL);
                            output.setColor(Bot.settings.embedColors.help);

                            // add enabled filters
                            var filtersObject: filtersObject = filtersDoc.toObject();
                            for (const filterName in filtersObject.filters) {
                                if (!filtersObject.filters[filterName]._enabled) continue;
                                var cmd = Bot.filters.get(filterName);
                                output.addField(cmd.name, cmd.shortHelp);
                            }

                            // send embed or say there aren't any enabled filters
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            if (output.fields.length == 0) {
                                message.channel.send('There aren\'t any enabled filters.');
                            } else {
                                message.channel.send(output);
                            }
                            Bot.mStats.logCommandUsage(command.name, 'listEnabled');
                            Bot.mStats.logMessageSend();
                            return;
                        }
                    }

                    // gets the structure object to list
                    var strucObject = Bot.filters.structure;
                    if (argsArray[argIndex]) { // search subcategories if one was defined
                        var keys = args.toLocaleLowerCase().split('/');
                        for (var i = 0; i < keys.length; i++) {
                            if (typeof (strucObject[keys[i]]) === 'undefined') {
                                message.channel.send('Couldn\'t find specified category');
                                Bot.mStats.logMessageSend();
                                return false;
                            } else {
                                strucObject = strucObject[keys[i]];
                            }
                        }
                    }
                    sendFilterList(guildWrapper, message, strucObject, args.slice(4), requestTime);
                    break;
                case 'enable':
                    argIndex++;
                    if (!argsArray[argIndex]) { // check if filter is specified
                        message.channel.send('Please input a filter');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    var filter = Bot.filters.get(argsArray[argIndex].toLowerCase());
                    if (!filter) { // check if filter exists
                        message.channel.send(`That isn't a filter.`);
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // load filter settings
                    var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);
                    var filterSettings = await Bot.database.getFilterSettings(message.guild.id, filter.name, filtersDoc);
                    if (filterSettings) {
                        if (filterSettings._enabled) { // if the filter is already enabled
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`The \`${filter.name}\` filter is already enabled.`);
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                    } else {
                        filterSettings = {};
                    }

                    // enable filter
                    filterSettings._enabled = true;
                    Bot.database.setFilterSettings(message.guild.id, filter.name, filterSettings, filtersDoc);

                    // send message that it was successfully enabled
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`Succesfully enabled the \`${filter.name}\` filter.`);
                    Bot.mStats.logMessageSend();
                    Bot.mStats.logCommandUsage(command.name, 'enable');
                    // log that the filter was enabled
                    Bot.logger.logFilter(guildWrapper, message.member, filter, logTypes.add);
                    break;
                case 'disable':
                    argIndex++;
                    if (!argsArray[argIndex]) { // check if filter is specified
                        message.channel.send('Please input a filter');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    var filter = Bot.filters.get(argsArray[argIndex].toLowerCase());
                    if (!filter) { // check if filter exists
                        message.channel.send(`That isn't a filter.`);
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    var filtersDoc = await Bot.database.findFiltersDoc(message.guild.id);
                    var filterSettings = await Bot.database.getFilterSettings(message.guild.id, filter.name, filtersDoc);
                    if (!filterSettings || !filterSettings._enabled) { // check if filter is already disabled
                        Bot.mStats.logResponseTime(filter.name, requestTime);
                        message.channel.send(`The \`${filter.name}\` filter is already disabled.`);
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // disable the filter
                    filterSettings._enabled = false;
                    Bot.database.setFilterSettings(message.guild.id, filter.name, filterSettings, filtersDoc);

                    // send message that it was successfully disabled
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`Succesfully disabled the \`${filter.name}\` filter.`);
                    Bot.mStats.logMessageSend();
                    Bot.mStats.logCommandUsage(command.name, 'disable');
                    // log that the filter was disabled
                    Bot.logger.logFilter(guildWrapper, message.member, filter, logTypes.remove);
                    break;
                default:
                    if (!argsArray[argIndex]) { // check if filter was specified
                        message.channel.send('Either that filter doesn\'t exist or ');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    var filter = Bot.filters.get(argsArray[argIndex]);
                    if (!filter) { // check if filter exists
                        message.channel.send('That isn\'t a filter');
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // send help embed of filter
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(await filter.embedHelp(message.guild));
                    Bot.mStats.logCommandUsage(command.name, 'help');
                    Bot.mStats.logMessageSend();
            }

        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;