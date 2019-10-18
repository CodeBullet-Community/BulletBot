import mongoose = require('mongoose');
import { caseDoc, caseObject, caseSchema, guildDoc, guildSchema, caseActions } from './schemas';
import { Guild, GuildMember, RichEmbed, User, } from 'discord.js';
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
     * @param {{ url: string, suffix: string }} clusterInfo
     * @memberof CaseLogger
     */
    constructor(clusterInfo: { url: string, suffix: string }) {
        var mainCon = mongoose.createConnection(clusterInfo.url + '/main' + clusterInfo.suffix, { useNewUrlParser: true });
        mainCon.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        mainCon.once('open', function () {
            console.log('caseLogger connected to /main database');
            Bot.caseLogger.guilds = mainCon.model('guild', guildSchema, 'guilds');
            Bot.caseLogger.cases = mainCon.model('cases', caseSchema, 'cases');
        });
        this.connection = mainCon;
    }

    /**
     * Logs a kick into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the member was kicked from
     * @param {GuildMember} member member that was kicked
     * @param {GuildMember} mod mod that kicked the member
     * @param {string} reason the reason why the member was kicked (optional)
    */

    async logKick(guild: Guild, member: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, member.user, mod, caseActions.kick, color, reason);
    }

    /**
     * Logs a ban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the member was banned from
     * @param {GuildMember} member member that was banned
     * @param {GuildMember} mod mod that banned the member
     * @param {string} reason the reason why the member was banned (optional)
     * @param {number} duration duration of the ban (optional)
     */
    async logBan(guild: Guild, member: GuildMember, mod: GuildMember, reason?: string, duration?: number) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, member.user, mod, caseActions.ban, color, reason, duration);
    }

    /**
     * Logs a softban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the member was softbanned from
     * @param {GuildMember} member member that was softbanned
     * @param {GuildMember} mod mod that softbanned the member
     * @param {string} reason the reason why the member was softbanned (optional)
     */
    async logSoftban(guild: Guild, member: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, member.user, mod, caseActions.softban, color, reason);
    }

    /**
     * Logs an unban into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the user was unbanned from
     * @param {GuildMember} user user that was unbanned
     * @param {GuildMember} mod mod that unbanned the user
     * @param {string} reason the reason why the user was unbanned (optional)
     */
    async logUnban(guild: Guild, user: User, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.positive;
        return await this.logCase(guild, user, mod, caseActions.unban, color, reason);
    }

    /**
     * Logs a mute into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the member was muted from
     * @param {GuildMember} member member that was muted
     * @param {GuildMember} mod mod that muted the member
     * @param {string} reason the reason why the member was muted (optional)
     * @param {number} duration duration of the mute (optional)
     */
    async logMute(guild: Guild, member: GuildMember, mod: GuildMember, reason?: string, duration?: number) {
        let color = Bot.database.settingsDB.cache.embedColors.negative;
        return await this.logCase(guild, member.user, mod, caseActions.mute, color, reason, duration);
    }

    /**
     * Logs an unmute into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the member was unmuted from
     * @param {GuildMember} member member that was unmuted
     * @param {GuildMember} mod mod that unmuted the member
     * @param {string} reason the reason why the member was unmuted (optional)
     */
    async logUnmute(guild: Guild, member: GuildMember, mod: GuildMember, reason?: string) {
        let color = Bot.database.settingsDB.cache.embedColors.positive;
        return await this.logCase(guild, member.user, mod, caseActions.unmute, color, reason);
    }

    /**
     * Logs a warn into the database and sends an case embed if case channel if provided
     * @param {Guild} guild where the member was warned from
     * @param {GuildMember} member member that was warned
     * @param {GuildMember} mod mod that warned the member
     * @param {string} reason the reason why the member was warned
     */
    async logWarn(guild: Guild, member: GuildMember, mod: GuildMember, reason: string) {
        let color = Bot.database.settingsDB.cache.embedColors.warn;
        return await this.logCase(guild, member.user, mod, caseActions.warn, color, reason);
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
     * @param guildID id of guild in which case is in
     * @param caseID id of case that should be deleted
     */
    async deleteCase(guildID: string, caseID: number) {
        let cases = await this.cases.findOne({ guild: guildID, caseID: caseID }).exec();
        if (cases) {
            await this.cases.deleteOne({ guild: guildID, caseID: caseID }).exec();
            return true;
        }
        return false;
    }

    /**
     * changes the reason of an existing case
     *
     * @param {string} guildID id of guild in which case is in
     * @param {string} caseID id of case that should be edited
     * @param {string} reason new reason
     * @returns
     * @memberof CaseLogger
     */
    async editReason(guildID: string, caseID: string, reason: string) {
        let success = false;
        if (!isNaN(Number(caseID))) {
            let editCase = await this.cases.findOne({ guild: guildID, caseID: caseID }).exec();
            if (editCase) {
                editCase.reason = reason;
                editCase.save();

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
    private async logCase(guild: Guild, user: User, mod: GuildMember, action: string, color: number, reason?: string, duration?: number) {
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

        // save case to database
        let caseDoc = new this.cases(caseObject);
        await caseDoc.save();
        guildDoc.totalCases = totalCases + 1;
        await guildDoc.save();

        // send case log in case log channel
        if (caseChannel) {
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
    createCaseEmbed(user: User, mod: GuildMember, caseID: number, action: string, color: number, duration?: number, reason?: string) {
        let date = new Date();
        var embed = new RichEmbed();
        embed.setAuthor(`Case ${caseID} | ${action} | ${user.tag}`, user.displayAvatarURL);
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