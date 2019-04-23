import mongoose = require('mongoose');
import { logDoc, logSchema, guildDoc, guildSchema, logObject, LOG_ACTION_STAFF, LOG_ACTION_COMMAND, LOG_ACTION_PREFIX, LOG_ACTION_FILTER, webhookDoc, LOG_ACTION_WEBHOOK, LOG_TYPE_ADD, LOG_TYPE_REMOVE, LOG_TYPE_CHANGE } from './schemas';
import { Guild, Role, User, GuildMember, Message, } from 'discord.js';
import { commandInterface } from '../commands';
import { Bot } from '..';
import { filterInterface } from '../filters';
import { filterAction, FILTER_ACTION } from '../utils/filters';
import { actionToString } from '../utils/parsers';
import { youtube } from '../bot-config.json';

export class Logger {

    mainDB: mongoose.Connection;
    guilds: mongoose.Model<guildDoc>;
    logs: mongoose.Model<logDoc>;

    constructor(URI: string, authDB: string) {
        var mainCon = mongoose.createConnection(URI + '/main' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        mainCon.on('error', console.error.bind(console, 'connection error:'));
        mainCon.once('open', function () {
            console.log('logger connected to /main database');
        });
        this.mainDB = mainCon;
        this.guilds = mainCon.model('guild', guildSchema, 'guilds');
        this.logs = mainCon.model('log', logSchema, 'logs');
    }

    /**
     * logs staff change in channel and saves log in database
     *
     * @param {Guild} guild
     * @param {GuildMember} mod
     * @param {(0 | 1)} type
     * @param {('admins' | 'mods' | 'immune')} rank
     * @param {Role} [role]
     * @param {User} [user]
     * @returns
     * @memberof Logger
     */
    async logStaff(guild: Guild, mod: GuildMember, type: 0 | 1, rank: 'admins' | 'mods' | 'immune', role?: Role, user?: User) {
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        var date = new Date();
        var logObject: logObject = {
            guild: guild.id,
            action: LOG_ACTION_STAFF,
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

        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        var logMessage: string;
        if (role) {
            logMessage = `Role \`${role.name}\``;
        }
        if (user) {
            logMessage = `User ${user.toString()}`;
        }
        logMessage += ` was ${type ? 'removed' : 'added'} to the ${rank} rank`;
        Bot.mStats.logMessageSend();
        logChannel.send(logMessage);
    }

    /**
     * logs webhook create/remove/change in database and log channel
     *
     * @param {Guild} guild
     * @param {GuildMember} mod
     * @param {string} service
     * @param {webhookDoc} webhookDoc
     * @param {(0 | 1 | 2)} type
     * @param {boolean} [changedChannel]
     * @param {boolean} [changedMessage]
     * @returns
     * @memberof Logger
     */
    async logWebhook(guild: Guild, mod: GuildMember, service: string, webhookDoc: webhookDoc, type: 0 | 1 | 2, changedChannel?: boolean, changedMessage?: boolean) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: LOG_ACTION_WEBHOOK,
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
            case LOG_TYPE_ADD:
                action = 'Created';
                break;
            case LOG_TYPE_REMOVE:
                action = 'Deleted';
                break;
            case LOG_TYPE_CHANGE:
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
     *
     * @param {Message} message
     * @param {filterInterface} filter
     * @param {string} reason
     * @param {filterAction[]} actions
     * @returns
     * @memberof Logger
     */
    async logFilterCatch(message: Message, filter: filterInterface, reason: string, actions: filterAction[]) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: message.guild.id }).exec();
        if (!guildDoc) return;

        var logChannel: any = message.guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();

        var actionsString = actionToString(actions[0]);
        var deleted = false;
        if (actions[0].type == FILTER_ACTION.DELETE) deleted = true;
        for (var i = 1; i < actions.length; i++) {
            if (actions[i].type == FILTER_ACTION.DELETE) deleted = true;
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
                "author": {
                    "name": "Filter: " + filter.name,
                    "icon_url": Bot.client.user.avatarURL
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
     * logs the toggling of a filter
     *
     * @param {Guild} guild
     * @param {GuildMember} mod
     * @param {commandInterface} command
     * @param {(0 | 1)} type
     * @returns
     * @memberof Logger
     */
    async logFilter(guild: Guild, mod: GuildMember, filter: filterInterface, type: 0 | 1) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: LOG_ACTION_FILTER,
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

        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `Filter \`${filter.name}\` was  ${type ? 'disabled' : 'enabled'}`,
                'color': Bot.database.settingsDB.cache.defaultEmbedColor,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Filter Change:',
                    'icon_url': Bot.client.user.avatarURL
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
     * logs the toggling of a command
     *
     * @param {Guild} guild
     * @param {GuildMember} mod
     * @param {commandInterface} command
     * @param {(0 | 1)} type
     * @returns
     * @memberof Logger
     */
    async logCommand(guild: Guild, mod: GuildMember, command: commandInterface, type: 0 | 1) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: LOG_ACTION_COMMAND,
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

        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `Command \`${command.name}\` was  ${type ? 'disabled' : 'enabled'}`,
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
     * Logs prefix change
     *
     * @param {Guild} guild
     * @param {GuildMember} mod
     * @param {string} oldPrefix
     * @param {string} newPrefix
     * @returns
     * @memberof Logger
     */
    async logPrefix(guild: Guild, mod: GuildMember, oldPrefix: string, newPrefix: string) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        var logObject: logObject = {
            guild: guild.id,
            mod: mod.id,
            action: LOG_ACTION_PREFIX,
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

        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'color': Bot.database.settingsDB.cache.defaultEmbedColor,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Changed Prefix:',
                    'icon_url': Bot.client.user.avatarURL
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