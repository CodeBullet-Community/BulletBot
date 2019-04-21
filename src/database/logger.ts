import mongoose = require('mongoose');
import { logDoc, logSchema, guildDoc, guildSchema, logObject, LOG_ACTION_STAFF, LOG_ACTION_COMMAND, LOG_ACTION_PREFIX } from './schemas';
import { Guild, Role, User, GuildMember, } from 'discord.js';
import { commandInterface } from '../commands';
import { Bot } from '..';

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
                        'value': `${await Bot.database.getPrefix(guild)}commands ${type ? 'enable' : 'disable'} ${command.name}` // TODO: make command
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