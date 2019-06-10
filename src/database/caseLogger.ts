import mongoose = require('mongoose');
import { caseDoc, caseObject, caseSchema, guildDoc, guildSchema, caseActions } from './schemas';
import { Guild, GuildMember, RichEmbed, } from 'discord.js';
import { Bot } from '..';
import { durationToString } from "../utils/parsers";

/**
 * Manages the connection to the case collection in the main database. It logs all cases that will be created in discord.
 * If a case channel is defined it will also send an embed with the case information in the corresponding channel
 * @export
 * @class CaseLogger
 */

export class CaseLogger {

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
            console.log('caseLogger connected to /main database');
        });
        this.connection = mainCon;
        this.guilds = mainCon.model('guild', guildSchema, 'guilds');
        this.cases = mainCon.model('cases', caseSchema, 'cases');
    }

    /**
     * Logs a kick into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was kicked from
     * @param {GuildMember} user user that was kicked
     * @param {GuildMember} mod mod that kicked the user
     * @param {string} reason the reason why the user was kicked (optional)
    */

    async logKick(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, user, mod, caseActions.kick, color, reason);
    }

    /**
     * Logs a ban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was banned from
     * @param {GuildMember} user user that was banned
     * @param {GuildMember} mod mod that banned the user
     * @param {string} reason the reason why the user was banned (optional)
     * @param {number} duration duration of the ban (optional)
     */
    async logBan(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string, duration?: number) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, user, mod, caseActions.ban, color, reason, duration);
    }

    /**
     * Logs a softban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was softbanned from
     * @param {GuildMember} user user that was softbanned
     * @param {GuildMember} mod mod that softbanned the user
     * @param {string} reason the reason why the user was softbanned (optional)
     */
    async logSoftban(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, user, mod, caseActions.softban, color, reason);
    }

    /**
     * Logs an unban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was unbanned from
     * @param {GuildMember} user user that was unbanned
     * @param {GuildMember} mod mod that unbanned the user
     * @param {string} reason the reason why the user was unbanned (optional)
     */
    async logUnban(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.positive;
        return await this.logCase(guild, user, mod, caseActions.unban, color, reason);
    }

    /**
     * Logs a mute into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was muted from
     * @param {GuildMember} user user that was muted
     * @param {GuildMember} mod mod that muted the user
     * @param {string} reason the reason why the user was muted (optional)
     * @param {number} duration duration of the mute (optional)
     */
    async logMute(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string, duration?: number) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, user, mod, caseActions.mute, color, reason, duration);
    }

    /**
     * Logs an unmute into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was unmuted from
     * @param {GuildMember} user user that was unmuted
     * @param {GuildMember} mod mod that unmuted the user
     * @param {string} reason the reason why the user was unmuted (optional)
     */
    async logUnmute(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.positive;
        return await this.logCase(guild, user, mod, caseActions.unmute, color, reason);
    }

    /**
     * Logs a warn into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was warned from
     * @param {GuildMember} user user that was warned
     * @param {GuildMember} mod mod that warned the user
     * @param {string} reason the reason why the user was warned
     */
    async logWarn(guild: Guild, user: GuildMember, mod: GuildMember, reason: string) {
        let color = Bot.database.settingsDB.cache.embedColors.warn;
        return await this.logCase(guild, user, mod, caseActions.warn, color, reason);
    }

    /**
     * retuns all cases of a guild
     * @param guildID ID of the guild where the cases are from
     */
    async findByGuild(guildID: string) {
        return await this.cases.find({ guild: guildID }).exec();
    }

    /**
     * returns a case by id
     * @param guildID ID of the guild where the cases are from
     * @param caseID the ID of the case
     */
    async findByCase(guildID: string, caseID: string) {
        return await this.cases.findOne({ guild: guildID, caseID: caseID }).exec();
    }

    /**
     * returns all cases by mod
     * @param guildID ID of the guild where the cases are from
     * @param modID the ID of the mod
     */
    async findByMod(guildID: string, modID: string) {
        return await this.cases.find({ guild: guildID, mod: modID }).exec();
    }

    /**
     * returns all cases by mod
     * @param guildID ID of the guild where the cases are from
     * @param userID the ID of the user
     */
    async findByMember(guildID: string, userID: string) {
        return await this.cases.find({ guild: guildID, user: userID }).exec();
    }

    /**
     * Deletes a case with a given case ID and returns a boolean when successful
     * @param guildID
     * @param caseID
     */
    async deleteCase(guildID: string, caseID: string) {
        let success = false;
        if (!isNaN(Number(caseID))) {
            let caseIDInt = parseInt(caseID);
            let cases = await this.cases.findOne({ guild: guildID, caseID: caseID }).exec();
            if (cases) {
                await this.cases.deleteOne({ guild: guildID, caseID: caseIDInt }).exec();

                success = true;
            }
        }
        return success;
    }

    /**
     * Logs a ban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the case is from
     * @param {GuildMember} user user that was mentioned
     * @param {GuildMember} mod mod that performed the action
     * @param action the action that is being performed (ban, kick etc.)
     * @param color the color of the embed
     * @param {string} reason the reason why the action was performed (optional)
     * @param {number} duration duration of the action (optional)
     */
    private async logCase(guild: Guild, user: GuildMember, mod: GuildMember, action: string, color: number, reason?: string, duration?: number) {
        let date = new Date();
        let guildDoc = await this.guilds.findOne({ guild: guild.id }).exec();
        let caseChannel = guild.channels.get(guildDoc.toObject().caseChannel);
        let totalCases = guildDoc.totalCases;

        if (!totalCases) totalCases = 0;

        let caseObject: caseObject = {
            guild: guild.id,
            caseID: totalCases + 1,
            user: user.id,
            action: action,
            timestamp: date.getTime(),
            duration: duration,
            mod: mod.id,
            reason: reason
        };

        let caseDoc = new this.cases(caseObject);
        await caseDoc.save();
        guildDoc.totalCases = totalCases + 1;
        await guildDoc.save();

        if (caseChannel){
        let caseEmbed = this.createCaseEmbed(user, mod, caseObject.caseID, action, color, duration, reason);
        // @ts-ignore
        caseChannel.send(caseEmbed);
        Bot.mStats.logMessageSend();
        }
        return caseObject;
    }

    /**
     * Creates the embed of a new case
     * @param {GuildMember} user user that was mentioned
     * @param {GuildMember} mod mod that performed the action
     * @param caseID the ID of the case
     * @param action the action that is being performed (ban, kick etc.)
     * @param color the color of the embed
     * @param {number} duration duration of the action (optional)
     * @param {string} reason the reason why the action was performed (optional)
     */
    private createCaseEmbed(user: GuildMember, mod: GuildMember, caseID: number, action: string, color: number, duration?: number, reason?: string) {
        let date = new Date();
        var embed = new RichEmbed();
        embed.setAuthor(`Case ${caseID} | ${action} | ${user.user.tag}`, user.user.displayAvatarURL);
        embed.setTimestamp(date);
        embed.setColor(color);
        embed.setFooter(`User: ${user.id} Mod: ${mod.id}`);
        embed.addField("Mod: ", mod, true);
        embed.addField("User: ", user, true);
        if (duration) embed.addField("Duration: ", durationToString(duration), true);
        if (reason) embed.addField("Reason: ", reason);

        return embed;
    }

}