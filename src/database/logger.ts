import { Channel, Guild, GuildMember, Message, Role, TextChannel, User } from 'discord.js';
import mongoose = require('mongoose');

import { Bot } from '..';
import { youtube } from '../bot-config.json';
import { commandInterface } from '../commands';
import { actionToString } from '../utils/parsers';
import { GuildWrapper } from './wrappers/main/guildWrapper';
import { GuildDoc, guildSchema, GuildRank, WebhookService, MegalogFunction } from './schemas/main/guild';
import { LogDoc, logSchema, LogObject, LogType, LogAction } from './schemas/main/log';
import { WebhookDoc } from './schemas/webhooks/_webhooks';

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
     * @type {mongoose.Model<GuildDoc>}
     * @memberof Logger
     */
    guilds: mongoose.Model<GuildDoc>;
    /**
     * model for logs collection
     *
     * @type {mongoose.Model<LogDoc>}
     * @memberof Logger
     */
    logs: mongoose.Model<LogDoc>;

    /**
     * Creates an instance of Logger, connections to main database and inits all models.
     * 
     * @param {{ url: string, suffix: string }} clusterInfo
     * @memberof Logger
     */
    constructor(clusterInfo: { url: string, suffix: string }) {
        var mainCon = mongoose.createConnection(clusterInfo.url + '/main' + clusterInfo.suffix, { useNewUrlParser: true });
        mainCon.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        mainCon.once('open', function () {
            console.log('logger connected to /main database');
            Bot.logger.guilds = mainCon.model('guild', guildSchema, 'guilds');
            Bot.logger.logs = mainCon.model('log', logSchema, 'logs');
        });
        this.connection = mainCon;
    }

    /**
     * Logs staff change for all ranks in database and log channel
     *
     * @param {Guild} guild guild where it actually was changed
     * @param {GuildMember} mod the member that made the change request
     * @param {(0 | 1)} type add or remove
     * @param {GuildRank} rank admins/mods/immune
     * @param {Role} [role] the added/removed role
     * @param {User} [user] the added/removed user
     * @returns
     * @memberof Logger
     */
    async logStaff(guild: Guild, mod: GuildMember, type: 0 | 1, rank: GuildRank, role?: Role, user?: User) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs logs in database
        var logObject: LogObject = {
            guild: guild.id,
            action: LogType.Staff,
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
                "color": Bot.settings.embedColors.default,
                "timestamp": date.toISOString(),
                "author": {
                    "name": rankName + " Rank:"
                }
            }
        }
        if (user) {
            embed.embed.thumbnail = { url: user.displayAvatarURL };
        }
        Bot.mStats.logMessageSend();
        logChannel.send(embed);
    }

    /**
     * logs webhook create/remove/change in database and log channel
     *
     * @param {Guild} guild guild where action was made
     * @param {GuildMember} mod member that made the action request
     * @param {WebhookService} service name of service
     * @param {WebhookDoc} webhookDoc the final state of the webhook doc
     * @param {(0 | 1 | 2)} type added/removed/changed
     * @param {boolean} [changedChannel] if channel was changed
     * @param {boolean} [changedMessage] if message was changed
     * @returns
     * @memberof Logger
     */
    async logWebhook(guild: Guild, mod: GuildMember, service: WebhookService, webhookDoc: WebhookDoc, type: 0 | 1 | 2, changedChannel?: boolean, changedMessage?: boolean) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: LogObject = {
            guild: guild.id,
            mod: mod.id,
            action: LogType.Webhook,
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
            case LogAction.Add:
                action = 'Created';
                break;
            case LogAction.Remove:
                action = 'Deleted';
                break;
            case LogAction.change:
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
     * logs the toggling of a command in database and log channel
     *
     * @param {GuildWrapper} guildWrapper guild where command was toggled
     * @param {GuildMember} mod member that requested the toggle
     * @param {commandInterface} command command that was actually toggled
     * @param {(0 | 1)} type enabled or disabled
     * @returns
     * @memberof Logger
     */
    async logCommand(guildWrapper: GuildWrapper, mod: GuildMember, command: commandInterface, type: 0 | 1) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guildWrapper.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: LogObject = {
            guild: guildWrapper.id,
            mod: mod.id,
            action: LogType.Command,
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
        var logChannel: any = guildWrapper.guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `Command \`${command.name}\` was  ${type ? 'disabled' : 'enabled'} by ${mod.toString()}`,
                'color': Bot.settings.embedColors.default,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Command Change:',
                    'icon_url': Bot.client.user.displayAvatarURL
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': command.help.shortDescription
                    },
                    {
                        'name': `${type ? 'Re-enable' : 'Disable'} Command:`,
                        'value': `${await guildWrapper.getPrefix()}commands ${type ? 'enable' : 'disable'} ${command.name}`
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
        var logObject: LogObject = {
            guild: guild.id,
            mod: mod.id,
            action: LogType.Prefix,
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
                'color': Bot.settings.embedColors.default,
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Changed Prefix:'
                },
                'fields': [
                    {
                        'name': 'New:',
                        'value': newPrefix || Bot.settings.prefix,
                        'inline': true
                    },
                    {
                        'name': 'Old:',
                        'value': oldPrefix || Bot.settings.prefix,
                        'inline': true
                    },
                    {
                        'name': 'Reset command:',
                        'value': Bot.settings.prefix + 'prefix reset'
                    }
                ]
            }
        });
    }

    /**
     * logs megalog settings change (enable/disable of hooks)
     *
     * @param {Guild} guild guild where change was made
     * @param {GuildMember} admin admin that made the change
     * @param {LogAction} type whether command was added or removed
     * @param {MegalogFunction[]} functions functions which were added / removed
     * @param {Channel} channel specifies the channed where the logging function has been placed
     * @returns
     * @memberof Logger
     */
    async logMegalog(guild: Guild, admin: GuildMember, type: LogAction.Add | LogAction.Remove, functions: MegalogFunction[], channel?: Channel) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: LogObject = {
            guild: guild.id,
            mod: admin.id,
            action: LogType.Megalog,
            timestamp: date.getTime(),
            info: {
                type: type,
                functions: functions,
                channel: channel ? channel.id : undefined
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();
        Bot.mStats.logLog();
        // for some reason there is always one more in the 'enabled' log call, so this is a hacky fix:
        let functionLength = functions.length;
        // logs log in log channel if one is specified
        var logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);
        if (!logChannel) return;
        Bot.mStats.logMessageSend();
        logChannel.send({
            'embed': {
                'description': `${functionLength} ${functionLength > 1 ? "functions were" : "function was"} ${type.valueOf() ? 'disabled' : 'enabled'} by ${admin.toString()}`,
                'color': type.valueOf() ? Bot.settings.embedColors.negative : Bot.settings.embedColors.positive, // bad or good?
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Megalog Logging Change',
                    'icon_url': guild.iconURL
                },
                'fields': [
                    {
                        'name': `Functions disabled/enabled`,
                        'value': functions.join('\n')
                    }
                ]
            }
        });
    }

    /**
     * logs megalog ignore settings change
     *
     * @param {Guild} guild guild where change was made
     * @param {GuildMember} admin admin that made the change
     * @param {(LogAction.Add | LogAction.Remove)} type whether command was added or removed
     * @param {TextChannel} channel channel that has been added/removed
     * @returns
     * @memberof Logger
     */
    async logMegalogIgnore(guild: Guild, admin: GuildMember, type: LogAction.Add | LogAction.Remove, channel: TextChannel) {
        var date = new Date();
        var guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        if (!guildDoc) return;

        // logs log in database
        var logObject: LogObject = {
            guild: guild.id,
            mod: admin.id,
            action: LogType.MegalogIgnore,
            timestamp: date.getTime(),
            info: {
                type: type,
                channel: channel.id
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
                'description': `${channel} has been ${type.valueOf() ? 'removed from' : 'added to'} ignored channels by ${admin}`,
                'color': type.valueOf() ? Bot.settings.embedColors.negative : Bot.settings.embedColors.positive, // bad or good?
                'timestamp': date.toISOString(),
                'author': {
                    'name': 'Megalog Logging Change',
                    'icon_url': guild.iconURL
                }
            }
        });
    }

}