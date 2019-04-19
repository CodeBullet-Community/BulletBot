import mongoose = require('mongoose');
import { logDoc, logSchema, guildDoc, guildSchema, youtubeWebhookDoc, logObject, LOG_ACTION_STAFF } from './schemas';
import { Message, Guild, Role, User, GuildMember, GuildChannel, TextChannel } from 'discord.js';

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
                role: role.id,
                user: user.id
            }
        }
        var logDoc = new this.logs(logObject);
        await logDoc.save();
        guildDoc.logs.push(logDoc.id);
        guildDoc.save();

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
        logChannel.send(logMessage);
    }

}