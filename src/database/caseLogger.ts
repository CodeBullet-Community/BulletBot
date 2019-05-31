import mongoose = require('mongoose');
import {caseDoc, caseObject, caseSchema, guildDoc, guildSchema} from './schemas';
import {Guild, GuildMember, RichEmbed,} from 'discord.js';
import {Bot} from '..';

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
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        await this.logCase(guild, user, mod,'Kick', color, reason);
    }

    async logBan(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string, duration?: number){
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        await this.logCase(guild, user, mod,'Ban', color, reason, duration);
    }

    async logSoftban(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        await this.logCase(guild, user, mod,'Softban', color, reason);
    }

    async logUnban(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        let color = Bot.database.settingsDB.cache.embedColors.positive;
        await this.logCase(guild, user, mod,'Unban', color, reason);
    }

    async logMute(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string, duration?: number){
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        await this.logCase(guild, user, mod,'Mute', color, reason, duration);
    }

    async logUnmute(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        let color = Bot.database.settingsDB.cache.embedColors.positive;
        await this.logCase(guild, user, mod,'Unmute', color, reason);
    }

    async logWarn(guild: Guild, user: GuildMember, mod: GuildMember, reason: string){
        let color = Bot.database.settingsDB.cache.embedColors.warn;
        await this.logCase(guild, user, mod,'Warn', color, reason);
    }

    async findByGuild(guildID: string){
        return await this.cases.find({guild: guildID}).exec();
    }

    async findByCase(guildID: string, caseID: string){
        return await this.cases.findOne({guild: guildID, caseID: caseID}).exec();
    }

    async findByMod(guildID: string, modID: string){
        return await this.cases.find({guild: guildID, mod: modID}).exec();
    }

    async findByMember(guildID: string, userID: string){
        return await this.cases.find({guild: guildID, user: userID}).exec();
    }

    async deleteCase(caseID: number){
        let success = false;
        let cases = await this.cases.findOne({caseID}).exec();
        if(cases){
            await this.cases.deleteOne({caseID: caseID}).exec();
            success = true;
        }
        return success;
    }

    private async logCase(guild: Guild, user: GuildMember, mod: GuildMember, action: string, color: number, reason?: string, duration?: number){
        let date = new Date();
        let guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        let caseChannel = guild.channels.get(guildDoc.toObject().caseChannel);
        let totalCases = guildDoc.totalCases;

        if(!totalCases) totalCases = 0;

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
        guildDoc.totalCases = totalCases+1;
        await guildDoc.save();

        if (!caseChannel) return;
        let caseEmbed = this.createCaseEmbed(user, mod, caseObject.caseID, action, color, duration, reason);
        // @ts-ignore
        caseChannel.send(caseEmbed);
        Bot.mStats.logMessageSend();


    }
    private createCaseEmbed(user: GuildMember, mod: GuildMember, caseID: number, action: string, color: number, duration?: number, reason?: string){
        let date = new Date();
        var embed = new RichEmbed();
        embed.setAuthor(`Case ${caseID} | ${action} | ${user.user.tag}`,user.user.avatarURL);
        // @ts-ignore
        embed.setTimestamp(date.toISOString());
        embed.setColor(color);
        embed.addField("Mod: ", mod,true);
        embed.addField("User: ", user,true);
        if(duration) embed.addField("Duration: ", duration,true);
        if(reason) embed.addField("Reason: ", reason);

        return embed;
    }

}