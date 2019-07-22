import mongoose = require('mongoose');
import { pActionDoc, pActionSchema, pActionObject, pActionActions, caseActions } from './schemas';
import { Bot } from '..';
import { pActionsInterval, YTResubInterval } from '../bot-config.json';
import { Guild, GuildMember, TextChannel } from 'discord.js';
import { durationToString } from '../utils/parsers';

/**
 * Manages pending actions and the connection to the pAction collection
 *
 * @export
 * @class PActions
 */
export class PActions {
    /**
     * Connection to the main database
     *
     * @type {mongoose.Connection}
     * @memberof PActions
     */
    connection: mongoose.Connection;
    /**
     * pActions collection
     *
     * @type {mongoose.Model<pActionDoc>}
     * @memberof PActions
     */
    pActions: mongoose.Model<pActionDoc>;
    /**
     * Creates an instance of PActions and connects to the pActions collection.
     * 
     * @param {string} URI
     * @param {string} authDB
     * @memberof PActions
     */
    constructor(URI: string, authDB: string) {
        this.connection = mongoose.createConnection(URI + '/main' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        this.connection.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        this.connection.once('open', function () {
            console.log('pActions connected to /main database');
        });
        this.pActions = this.connection.model('pAction', pActionSchema, 'pActions');
        setInterval(() => {
            this.executeActions();
        }, pActionsInterval);
    }

    /**
     * executes all actions that aren't pending anymore
     *
     * @memberof PActions
     */
    async executeActions() {
        if (Bot.client.status != 0) return;
        let actions = await this.pActions.find({ to: { $lte: Date.now() } });
        for (const action of actions) {
            let actionObject: pActionObject = action.toObject();
            let guild: Guild;
            switch (actionObject.action) {
                case pActionActions.mute:
                    {
                        //@ts-ignore
                        guild = Bot.client.guilds.get(actionObject.info.guild);
                        if (!guild) break;
                        if (!guild.me.hasPermission('MANAGE_ROLES')) break;

                        let member: GuildMember;
                        try {
                            //@ts-ignore
                            member = await guild.fetchMember(actionObject.info.user);
                        } catch (e) {
                            break;
                        }
                        if (!member) break;

                        let durationString = durationToString(actionObject.to - actionObject.from);
                        let role = member.roles.find(role => role.name.toLowerCase() == 'muted')
                        //@ts-ignore
                        if (role) member.removeRole(role, `Auto unmute for case ${actionObject.info.case} after ${durationString}`);

                        // sends log in caseChannel
                        let guildDoc = await Bot.database.findGuildDoc(guild.id, ['caseChannel']);
                        if (!guildDoc || !guildDoc.caseChannel) break;
                        let caseChannel = guild.channels.get(guildDoc.caseChannel);
                        if (!caseChannel || !(caseChannel instanceof TextChannel)) break;
                        //@ts-ignore
                        caseChannel.send(Bot.caseLogger.createCaseEmbed(member.user, guild.me, actionObject.info.case, caseActions.unmute, Bot.database.settingsDB.cache.embedColors.positive, null, `Auto unmute for case ${actionObject.info.case} after ${durationString}`));
                        break;
                    }
                case pActionActions.ban:
                    {
                        //@ts-ignore
                        guild = Bot.client.guilds.get(actionObject.info.guild);
                        if (!guild) break;
                        if (!guild.me.hasPermission('BAN_MEMBERS')) break;
                        //@ts-ignore
                        let banInfo = await guild.fetchBan(actionObject.info.user);
                        if (!banInfo) break;
                        let durationString = durationToString(actionObject.to - actionObject.from);
                        //@ts-ignore
                        guild.unban(actionObject.info.user, `Auto unban for case ${actionObject.info.case} after ${durationString}`).catch(reason => { });

                        // sends log in caseChannel
                        let guildDoc = await Bot.database.findGuildDoc(guild.id, ['caseChannel']);
                        if (!guildDoc || !guildDoc.caseChannel) break;
                        let caseChannel = guild.channels.get(guildDoc.caseChannel);
                        if (!caseChannel || !(caseChannel instanceof TextChannel)) break;
                        //@ts-ignore
                        caseChannel.send(Bot.caseLogger.createCaseEmbed(banInfo.user, guild.me, actionObject.info.case, caseActions.unban, Bot.database.settingsDB.cache.embedColors.positive, null, `Auto unban for case ${actionObject.info.case} after ${durationString}`));
                        break;
                    }
                case pActionActions.lockChannel:
                    {
                        //@ts-ignore
                        guild = Bot.client.guilds.get(actionObject.info.guild);
                        if (!guild) break;
                        if (!guild.me.hasPermission('MANAGE_CHANNELS')) break;
                        //@ts-ignore
                        let channel = guild.channels.get(actionObject.info.channel);
                        if (!channel || !(channel instanceof TextChannel)) break;
                        let durationString = durationToString(actionObject.to - actionObject.from);
                        //@ts-ignore
                        for (const id of actionObject.info.allowOverwrites)
                            await channel.overwritePermissions(id, { SEND_MESSAGES: true }, `Auto unlock after ${durationString}`);
                        //@ts-ignore
                        for (const id of actionObject.info.neutralOverwrites) {
                            let permOverwrite = channel.permissionOverwrites.get(id);
                            if (permOverwrite)
                                if ((permOverwrite.allow == 0 && permOverwrite.deny == 2048) || (permOverwrite.deny == 0 && permOverwrite.allow == 2048)) {
                                    permOverwrite.delete();
                                } else {
                                    channel.overwritePermissions(id, { SEND_MESSAGES: null }, `Auto unlock after ${durationString}`);
                                }
                        }

                        channel.send('Channel is unlocked now');
                        Bot.mStats.logMessageSend();

                        let updateDoc = {};
                        updateDoc['$unset'] = {};
                        updateDoc['$unset'][`locks.${channel.id}`] = "";
                        //@ts-ignore
                        Bot.database.mainDB.guilds.updateOne({ guild: actionObject.info.guild }, updateDoc).exec();
                        break;
                    }
                case pActionActions.resubWebhook:
                    {
                        //@ts-ignore
                        switch (actionObject.info.service) {
                            case 'youtube':
                                Bot.youtube.resubWebhooks();
                                this.addWebhookResub('youtube', actionObject.to + YTResubInterval);
                        }
                        break;
                    }
            }
            action.remove();
        }
    }

    /**
     * creates a pending unmute. If one already exists for the specific guild and user it will just overwrite the case ID and until value.
     *
     * @param {string} guildID guild id
     * @param {string} userID user id of muted member
     * @param {number} until timestamp when they should get unmuted
     * @param {string} caseID case id
     * @returns
     * @memberof PActions
     */
    async addMute(guildID: string, userID: string, until: number, caseID: number) {
        let pMute = await this.pActions.findOne({ action: pActionActions.mute, info: { guild: guildID, user: userID } }).exec();
        if (pMute) {
            pMute.to = until;
            //@ts-ignore
            pMute.info.case = caseID;
            pMute.markModified('info.case');
            pMute.markModified('to');
        } else {
            pMute = new this.pActions({
                from: Date.now(),
                to: until,
                action: pActionActions.mute,
                info: {
                    guild: guildID,
                    user: userID,
                    case: caseID
                }
            });
        }
        return pMute.save();
    }

    /**
     * removes a pending mute
     *
     * @param {string} guildID guild id
     * @param {string} userID user id of muted member
     * @returns
     * @memberof PActions
     */
    removeMute(guildID: string, userID: string) {
        return this.pActions.deleteOne({ action: pActionActions.mute, 'info.guild': guildID, 'info.user': userID }).exec();
    }

    /**
     * creates a pending unban
     *
     * @param {string} guildID guild id
     * @param {string} userID user id that should be unbanned
     * @param {number} until timestamp when they should get unbanned
     * @param {number} caseID case id
     * @returns
     * @memberof PActions
     */
    addBan(guildID: string, userID: string, until: number, caseID: number) {
        let pBan = new this.pActions({
            from: Date.now(),
            to: until,
            action: pActionActions.ban,
            info: {
                guild: guildID,
                user: userID,
                case: caseID
            }
        });
        return pBan.save();
    }

    /**
    * removes a pending ban
    *
    * @param {string} guildID guild id
    * @param {string} userID user id of banned member
    * @returns
    * @memberof PActions
    */
    removeBan(guildID: string, userID: string) {
        return this.pActions.deleteOne({ action: pActionActions.ban, 'info.guild': guildID, 'info.user': userID }).exec();
    }

    /**
     * creates pending channel unlock. If there already is one with for the specific guild and channel, it will overwrite the until property.
     *
     * @param {string} guildID guild id
     * @param {string} channelID channel that needs to be unlocked
     * @param {string[]} allowOverwrites role/user ids that had originally a allow overwrite
     * @param {string[]} neutralOverwrites role/user ids that had originally a neutral overwrite
     * @param {number} until timestamp when the channel should get unlocked
     * @returns
     * @memberof PActions
     */
    async addLockChannel(guildID: string, channelID: string, allowOverwrites: string[], neutralOverwrites: string[], until: number) {
        let pLock = await this.pActions.findOne({ action: pActionActions.lockChannel, 'info.guild': guildID, 'info.channel': channelID }).exec();
        if (!pLock) {
            pLock = new this.pActions({
                from: Date.now(),
                to: until,
                action: pActionActions.lockChannel,
                info: {
                    guild: guildID,
                    channel: channelID,
                    allowOverwrites: allowOverwrites,
                    neutralOverwrites: neutralOverwrites
                }
            });
        } else {
            pLock.to = until;
            pLock.markModified('to');
        }
        return pLock.save();
    }

    /**
    * removes a pending channel unlock
    *
    * @param {string} guildID guild id
    * @param {string} channelID channel that needs to be unlocked
    * @returns
    * @memberof PActions
    */
    removeLockChannel(guildID: string, channelID: string) {
        return this.pActions.deleteOne({ action: pActionActions.lockChannel, 'info.guild': guildID, 'info.channel': channelID }).exec();
    }

    /**
     * creates a pending webhook resub
     *
     * @param {'youtube'} service which service should do a resub
     * @param {number} timestamp when it should do the resub
     * @returns
     * @memberof PActions
     */
    addWebhookResub(service: 'youtube', timestamp: number) {
        let pResub = new this.pActions({
            from: Date.now(),
            to: timestamp,
            action: pActionActions.resubWebhook,
            info: {
                service: service
            }
        });
        return pResub.save();
    }
}