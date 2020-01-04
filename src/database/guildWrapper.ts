import mongoose = require('mongoose');
import { Guild, GuildMember, User, UserResolvable } from "discord.js";
import { guildDoc, UsageLimits, guildObject } from "./schemas";
import { Bot } from '..';
import { getPermLevel } from '../utils/permissions';

class GuildWrapper implements guildObject {
    guildObject: Guild;
    doc: guildDoc;
    guild: string;
    logChannel: string;
    caseChannel: string;
    totalCases: number;
    logs: mongoose.Schema.Types.ObjectId[];
    staff: mongoose.Schema.Types.ObjectId;
    modmailChannel: string;
    webhooks: { [key: string]: mongoose.Schema.Types.ObjectId[]; };
    locks: { [key: string]: { until?: number; allowOverwrites: string[]; neutralOverwrites: string[]; }; };
    usageLimits?: UsageLimits;

    /**
     * Creates an instance of GuildWrapper. Only one parameter has to be provided, 
     * but providing both guild and guildDoc does make things faster. 
     * If guildDoc wasn't provided it, doc wont' immediately be set.
     * 
     * @param {Guild} guild Guild discord.js object
     * @param {string} [guildID] guild ID
     * @param {guildDoc} [guildDoc] guild document
     * @memberof GuildWrapper
     */
    constructor(guild: Guild, guildID?: string, guildDoc?: guildDoc) {
        if (guildDoc) {
            this.doc = guildDoc;
            this.syncWrapperWithObject();
        } else
            Bot.database.findGuildDoc(guildID || guild.id).then(guildDoc => {
                if (!guildDoc)
                    throw new Error(`Guild Doc for ${guildID || guild.id} not found`);
                this.doc = guildDoc
                this.syncWrapperWithObject();
            });

        this.guildObject = guild;
        if (!guild && (guildID || guildDoc))
            this.guildObject = Bot.client.guilds.get(guildID || guildDoc.guild);
        if (!this.guildObject)
            throw new Error(`Guild ${guildID || guildDoc.guild} not found`);
    }

    private syncWrapperWithObject() {
        let object: guildObject = this.doc.toObject();
        for (const key in object)
            this[key] = object[key];
    }

    /**
     * returns the case log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCaseChannel() {
        if (!this.doc.caseChannel) return undefined;
        return this.guildObject.channels.get(this.doc.caseChannel);
    }

    /**
     * returns the log channel object
     *
     * @returns
     * @memberof GuildWrapper
     */
    getLogChannel() {
        if (!this.doc.logChannel) return undefined;
        return this.guildObject.channels.get(this.doc.logChannel);
    }

    /**
     * returns promise with specified case document
     *
     * @param {number} caseID case ID of case to be returned
     * @returns
     * @memberof GuildWrapper
     */
    getCase(caseID: number) {
        return Bot.caseLogger.findByCase(this.doc.guild, caseID);
    }

    /**
     * deletes the specified case from the database
     *
     * @param {number} caseID case that should be deleted
     * @returns
     * @memberof GuildWrapper
     */
    removeCase(caseID: number) {
        return Bot.caseLogger.deleteCase(this.doc.guild, caseID);
    }

    /**
     * returns a promise with an array of all cases
     *
     * @returns
     * @memberof GuildWrapper
     */
    getCases() {
        return Bot.caseLogger.findByGuild(this.doc.guild);
    }

    /**
     * get permission level of user / member
     *
     * @param {UserResolvable} user user of which to get permission level
     * @returns permission level or undefined if member was not found
     * @memberof GuildWrapper
     */
    async getUserPermLevel(user: UserResolvable) {
        if (user instanceof GuildMember)
            return getPermLevel(user);
        return getPermLevel(await this.guildObject.fetchMember(user));
    }

    /**
     * adds user/role to admin/mod/immune rank
     *
     * @param {('admins' | 'mods' | 'immune')} rank which rank the user/role should be added to
     * @param {string} [roleID] id of role to add
     * @param {string} [userID] id of user to add
     * @returns if added was successful
     * @memberof GuildWrapper
     */
    addToRank(rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        return Bot.database.addToRank(this.doc.guild, rank, roleID, userID);
    }

    /**
     * removes user/role from the admin/mod/immune rank
     *
     * @param {('admins' | 'mods' | 'immune')} rank rank the user should be removed from
     * @param {string} [roleID] id of role to remove
     * @param {string} [userID] id of user to remove
     * @returns if removal was successful
     * @memberof GuildWrapper
     */
    removeFromRank(rank: 'admins' | 'mods' | 'immune', roleID?: string, userID?: string) {
        return Bot.database.removeFromRank(this.doc.guild, rank, roleID, userID);
    }

    // TODO: add functions for webhooks
    // TODO: add functions for adding/removing locks

    getUsageLimits(){
        return this.usageLimits || Bot.database.settingsDB.cache.usageLimits;
    }

}