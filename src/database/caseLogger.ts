import mongoose = require('mongoose');
import {caseDoc, caseSchema, caseObject, guildDoc, guildSchema} from './schemas';
import {Guild, Role, User, GuildMember, Message, RichEmbed,} from 'discord.js';
import { Bot } from '..';
import {getDayDiff, timeFormat} from "../utils/time";

export class CaseLogger{

    /**
     * connection to main database
     * @type {mongoose.Connection}
     * @memberof CaseLogger
     */
    connection: mongoose.Connection;
    /**
     * model for guild collection
     * @type {mongoose.Model<caseDoc>}
     * @memberof CaseLogger
     */
    guilds: mongoose.Model<guildDoc>;
    /**
     * model for case collection
     * @type {mongoose.Model<caseDoc>}
     * @memberof CaseLogger
     */
    cases: mongoose.Model<caseDoc>;
    /**
     * Creates an instance of CaseLogger, connections to main database and inits all models.
     * @param {string} URI
     * @param {string} authDB
     * @memberof CaseLogger
     */
    constructor(URI: string, authDB: string) {
        var mainCon = mongoose.createConnection(URI + '/main' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        mainCon.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        mainCon.once('open', function () {
            console.log('logger connected to /main database');
        });
        this.connection = mainCon;
        this.guilds = mainCon.model('guild', guildSchema, 'guilds');
        this.cases = mainCon.model('cases', caseSchema, 'cases');
    }

    async logKick(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        await this.logCase(guild, user, mod,'Kick', reason);
    }

    async logBan(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string, duration?: number){
        await this.logCase(guild, user, mod,'Ban', reason, duration);
    }

    async logSoftban(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        await this.logCase(guild, user, mod,'Softban', reason);
    }

    async logUnban(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        await this.logCase(guild, user, mod,'Unban', reason);
    }

    async logMute(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string, duration?: number){
        await this.logCase(guild, user, mod,'Mute', reason, duration);
    }

    async logUnmute(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        await this.logCase(guild, user, mod,'Unmute', reason);
    }

    async logWarn(guild: Guild, user: GuildMember, mod: GuildMember, reason: string){
        await this.logCase(guild, user, mod,'Warn', reason);
    }

    private async logCase(guild: Guild, user: GuildMember, mod: GuildMember, action: string, reason?: string, duration?: number){
        let date = new Date();
        let guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        let logChannel: any = guild.channels.get(guildDoc.toObject().logChannel);

        let caseObject: caseObject = {
            guild: guild.id,
            caseID: Date.now(),
            user: user.id,
            action: action,
            timestamp: date.getTime(),
            duration: duration,
            mod: mod.id,
            reason: reason
        };

        let caseDoc = new this.cases(caseObject);
        await caseDoc.save();

        if (!logChannel) return;
        let caseEmbed = this.createCaseEmbed(user, mod, caseObject.caseID, action, duration);
        logChannel.send(caseEmbed);


    }
    private createCaseEmbed(user: GuildMember, mod: GuildMember, caseID: number, action: string, duration?: number, reason?: string){
        var embed = new RichEmbed();
        embed.setAuthor(`A case was created`);
        embed.setFooter(`ID: ${caseID}`);
        // @ts-ignore
        embed.setTimestamp(date.toISOString());
        embed.setColor(Bot.database.settingsDB.cache.embedColors.warn);
        embed.addField('Type: ',action,true);
        embed.addField("Mod: ", mod,true);
        embed.addField("User: ", user,true);
        if(duration) embed.addField("Duration: ", duration,true);
        if(reason) embed.addField("Reason: ", reason,true);

        return embed;
    }

}