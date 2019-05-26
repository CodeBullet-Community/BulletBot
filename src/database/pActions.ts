import mongoose = require('mongoose');
import { pActionDoc, pActionSchema, pActionObject } from './schemas';
import { Bot } from '..';
import { pActionsInterval } from '../bot-config.json';
import { Guild, GuildMember } from 'discord.js';

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
                case 'mute':
                    //@ts-ignore
                    guild = Bot.client.guilds.get(actionObject.info.guild);
                    if (!guild) break;
                    if (!guild.me.hasPermission('MANAGE_ROLES')) return;

                    let member: GuildMember;
                    try {
                        //@ts-ignore
                        member = await guild.fetchMember(actionObject.info.user);
                    } catch (e) {
                        break;
                    }
                    if (!member) break;

                    let role = member.roles.find(role => role.name.toLowerCase() == 'muted')
                    //@ts-ignore
                    if (role) member.removeRole(role, 'Auto Unmute for case ' + actionObject.info.case);
                    break;
                case 'ban':
                    //@ts-ignore
                    guild = Bot.client.guilds.get(actionObject.info.guild);
                    if (!guild) break;
                    if (!guild.me.hasPermission('BAN_MEMBERS')) return;
                    //@ts-ignore
                    guild.unban(actionObject.info.user, 'Auto Unban').catch(reason => { });

                    break;
                case 'lockChannel':
                    break;
                case 'resubWebhook':
                    break;
            }
            action.remove();
        }
    }

    /**
     * creates a pending unmute
     *
     * @param {string} guildID guild id
     * @param {string} userID user id of muted member
     * @param {number} until timestamp when they should get unmuted
     * @param {string} caseID case id
     * @returns
     * @memberof PActions
     */
    addMute(guildID: string, userID: string, until: number, caseID: number) {
        let pMute = new this.pActions({
            from: Date.now(),
            to: until,
            action: 'mute',
            info: {
                guild: guildID,
                user: userID,
                case: caseID
            }
        });
        return pMute.save();
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
            action: 'ban',
            info: {
                guild: guildID,
                user: userID,
                case: caseID
            }
        });
        return pBan.save();
    }
}