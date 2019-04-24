import mongoose = require('mongoose');
import { logDoc, logSchema, guildDoc, guildSchema, logObject, logActions, webhookDoc, logTypes } from './schemas';
import { Guild, Role, User, GuildMember, Message, } from 'discord.js';
import { commandInterface } from '../commands';
import { Bot } from '..';
import { filterInterface } from '../filters';
import { filterAction, filterActions } from '../utils/filters';
import { actionToString } from '../utils/parsers';
import { youtube } from '../bot-config.json';

/**
 * Manages connection to main database with the logs collection. It logs actions into the the database and if a log channel was define also into discord.
 * The Messages are auto generated with the given input. All actions that need to be logged run through this class.
 *
 * @export
 * @class Logger
 */
export class Logger {

    /**
     * connection to main database
     *
     * @type {mongoose.Connection}
     * @memberof Logger
     */
    connection: mongoose.Connection;
    /**
     * model for guilds collection
     *
     * @type {mongoose.Model<guildDoc>}
     * @memberof Logger
     */
    guilds: mongoose.Model<guildDoc>;
    /**
     * model for logs collection
     *
     * @type {mongoose.Model<logDoc>}
     * @memberof Logger
     */
    logs: mongoose.Model<logDoc>;

    /**
     * Creates an instance of Logger, connections to main database and inits all models.
     * 
     * @param {string} URI
     * @param {string} authDB
     * @memberof Logger
     */
    constructor(URI: string, authDB: string) {
        var mainCon = mongoose.createConnection(URI + '/main' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        mainCon.on('error', console.error.bind(console, 'connection error:'));
        mainCon.once('open', function () {
            console.log('logger connected to /main database');
        });
        this.connection = mainCon;
        this.guilds = mainCon.model('guild', guildSchema, 'guilds');
        this.logs = mainCon.model('log', logSchema, 'logs');
    }

    /**
     * Logs staff change for all ranks in database and log channel
     *
     * @param {Guild} guild guild where it actually was changed
     * @param {GuildMember} mod the member that made the change request
     * @param {(0 | 1)} type add or remove
     * @param {('admins' | 'mods' | 'immune')} rank admins/mods/immune
     * @param {Role} [role] the added/removed role
     * @param {User} [user] the added/removed user
     * @returns
     * @memberof Logger
     */
    async logStaff(guild: Guild, mod: GuildMember, type: 0 | 1, rank: 'admins' | 'mods' | 'immune', role?: Role, user?: User) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs logs in database
        var logObject: logObject = {
            guild: guild.id,
            action: logActions.staff,
            mod: mod.id,
            timestamp: date.getTime(),
            info: {
                type: type,
                rank: rank,
                role: role ? role.id : undefined,
                user: user ? user.id : undefined
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();
        Bot.mStats.logLog();

        // sends log into log channel if one is specified
        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        var rankName = rank.charAt(0).toUpperCase() + rank.slice(1);
        var embed: any = {
            "embed": {
                "description": `${role ? 'Role ' + role.toString() : 'User' + user.toString()} was ${type ? 'removed' : 'added'} to ${rank} rank by ${mod.toString()}`,
                "color": Bot.database.settingsDB.cache.defaultEmbedColor,
                "timestamp": date.toISOString(),
                "author": {
                    "name": rankName + " Rank:"
                }
            }
        }
        if (user) {
            embed.embed.thumbnail = { url: user.avatarURL };
        }
        Bot.mStats.logMessageSend();
        logChannel.send(embed);
    }

    /**
     * logs webhook create/remove/change in database and log channel
     *
     * @param {Guild} guild guild where action was made
     * @param {GuildMember} mod member that made the action request
     * @param {string} service name of service
     * @param {webhookDoc} webhookDoc the final state of the webhook doc
     * @param {(0 | 1 | 2)} type added/removed/changed
     * @param {boolean} [changedChannel] if channel was changed
     * @param {boolean} [changedMessage] if message was changed
     * @returns
     * @memberof Logger
     */
    async logWebhook(guild: Guild, mod: GuildMember, service: string, webhookDoc: webhookDoc, type: 0 | 1 | 2, changedChannel?: boolean, changedMessage?: boolean) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: logActions.webhook,
            timestamp: date.getTime(),
            info: {
                type: type,
                service: service,
                webhookID: webhookDoc.id,
                changedChannel: changedChannel,
                changedMessage: changedMessage
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();
        Bot.mStats.logLog();

        // logs log in log channel if one is specified
        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        var color = 0;
        var logo = '';
        var name = '';
        switch (service) {
            case 'youtube':
                color = youtube.color;
                logo = youtube.logo;
                name = youtube.name;
                break;
        }
        var action = '';
        switch (type) {
            case logTypes.add:
                action = 'Created';
                break;
            case logTypes.remove:
                action = 'Deleted';
                break;
            case logTypes.change:
                action = 'Changed';
                break;
        }
        logChannel.send({
            "embed": {
                "description": `${mod.toString()} ${action.toLowerCase()} a webhook`,
                "color": color,
                "timestamp": date.toISOString(),
                "author": {
                    "name": `${name} Webhook ${action}`,
                    "icon_url": logo
                },
                "fields": [
                    {
                        "name": "Feed",
                        "value": 'https://youtube.com/channel/' + webhookDoc.toObject().feed
                    },
                    {
                        "name": (changedChannel ? 'New ' : '') + "Channel",
                        "value": guild.channels.get(webhookDoc.toObject().channel).toString(),
                        "inline": true
                    },
                    {
                        "name": (changedMessage ? 'New ' : '') + "Message:",
                        "value": webhookDoc.toObject().message,
                        "inline": true
                    }
                ]
            }
        });
    }

    /**
     * send a log message for the catch, but doesn't save it in the database
     * it will get saved in the database in the next version when we implement the case system
     *
     * @param {Message} message message that was caught 
     * @param {filterInterface} filter filter that triggered
     * @param {string} reason reason why filter triggered
     * @param {filterAction[]} actions actions that filter requested
     * @returns
     * @memberof Logger
     */
    async logFilterCatch(message: Message, filter: filterInterface, reason: string, actions: filterAction[]) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: message.guild.id }).exec();
        if (!guildDoc) return;

        // logs log in log channel if one is specified
        var logChannel: any = message.guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();

        var actionsString = actionToString(actions[0]);
        var deleted = false;
        if (actions[0].type == filterActions.delete) deleted = true;
        for (var i = 1; i < actions.length; i++) {
            if (actions[i].type == filterActions.delete) deleted = true;
            actionsString += "\n" + actionToString(actions[i]);
        }
        var content = message.content;
        if (!deleted) {
            content = `[Jump to Message](${message.url})\n` + content;
        }

        logChannel.send({
            "embed": {
                "description": filter.shortHelp,
                "color": Bot.database.settingsDB.cache.defaultEmbedColor,
                "timestamp": message.createdAt.toISOString(),
                "thumbnail": {
                    "url": message.member.user.avatarURL
                },
                "author": {
                    "name": "Filter: " + filter.name
                },
                "fields": [
                    {
                        "name": "From:",
                        "value": message.author.toString() + " (" + message.author.id + ")",
                        "inline": true
                    },
                    {
                        "name": "Reason:",
                        "value": reason,
                        "inline": true
                    },
                    {
                        "name": "Message:",
                        "value": content
                    },
                    {
                        "name": "Actions",
                        "value": actionsString
                    }
                ]
            }
        });
    }

    /**
     * logs a filter toggle in database and log channel
     *
     * @param {Guild} guild guild where filter was toggled
     * @param {GuildMember} mod member that requested the toggle
     * @param {filterInterface} filter filter that was toggled
     * @param {(0 | 1)} type enabled or disabled
     * @returns
     * @memberof Logger
     */
    async logFilter(guild: Guild, mod: GuildMember, filter: filterInterface, type: 0 | 1) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: logActions.filter,
            timestamp: date.getTime(),
            info: {
                type: type,
                filter: filter.name
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();
        Bot.mStats.logLog();

        // logs log in log channel if one is specified
        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `Filter \`${filter.name}\` was  ${type ? 'disabled' : 'enabled'} by ${mod.toString()}`,
                'color': Bot.database.settingsDB.cache.defaultEmbedColor,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Filter Change:'
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': filter.shortHelp
                    },
                    {
                        'name': `${type ? 'Enable' : 'Disable'} Filter:`,
                        'value': `${await Bot.database.getPrefix(guild)}filters ${type ? 'enable' : 'disable'} ${filter.name}`
                    }
                ]
            }
        });
    }

    /**
     * logs the toggling of a command in database and log channel
     *
     * @param {Guild} guild guild where command was toggled
     * @param {GuildMember} mod member that requested the toggle
     * @param {commandInterface} command command that was actually toggled
     * @param {(0 | 1)} type enabled or disabled
     * @returns
     * @memberof Logger
     */
    async logCommand(guild: Guild, mod: GuildMember, command: commandInterface, type: 0 | 1) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: logActions.command,
            timestamp: date.getTime(),
            info: {
                type: type,
                command: command.name
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();
        Bot.mStats.logLog();

        // logs log in log channel if one is specified
        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `Command \`${command.name}\` was  ${type ? 'disabled' : 'enabled'} by ${mod.toString()}`,
                'color': Bot.database.settingsDB.cache.defaultEmbedColor,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Command Change:',
                    'icon_url': Bot.client.user.avatarURL
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': command.shortHelp
                    },
                    {
                        'name': `${type ? 'Re-enable' : 'Disable'} Command:`,
                        'value': `${await Bot.database.getPrefix(guild)}commands ${type ? 'enable' : 'disable'} ${command.name}`
                    }
                ]
            }
        });
    }

    /**
     * Logs prefix change in database and log channel
     *
     * @param {Guild} guild guild where prefix was actually changed
     * @param {GuildMember} mod member that requested the prefix change
     * @param {string} oldPrefix the old prefix
     * @param {string} newPrefix the new prefix
     * @returns
     * @memberof Logger
     */
    async logPrefix(guild: Guild, mod: GuildMember, oldPrefix: string, newPrefix: string) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: logActions.prefix,
            timestamp: date.getTime(),
            info: {
                old: oldPrefix,
                new: newPrefix
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();
        Bot.mStats.logLog();

        // logs log in log channel if on is specified
        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `The prefix was changed by ${mod.toString()}`,
                'color': Bot.database.settingsDB.cache.defaultEmbedColor,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Changed Prefix:'
                },
                'fields': [
                    {
                        'name': 'New:',
                        'value': newPrefix,
                        'inline': true
                    },
                    {
                        'name': 'Old:',
                        'value': oldPrefix,
                        'inline': true
                    },
                    {
                        'name': 'Reset command:',
                        'value': Bot.database.settingsDB.cache.prefix + 'prefix reset'
                    }
                ]
            }
        });
    }

}