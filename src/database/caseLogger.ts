import mongoose = require('mongoose');
import { caseDoc, caseSchema, caseObject } from './schemas';
import { Guild, Role, User, GuildMember, Message, } from 'discord.js';
import { Bot } from '..';

export class CaseLogger{

    /**
     * connection to main database
     * @type {mongoose.Connection}
     * @memberof CaseLogger
     */
    connection: mongoose.Connection;
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
     * @memberof Logger
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
        this.cases = mainCon.model('cases', caseSchema, 'cases');
    }

    async logKick(guild: Guild, user: GuildMember, mod: GuildMember, reason?: string){
        let date = new Date();

        let caseObject: caseObject = {
            guild: guild.id,
            caseID: Date.now(),
            user: user.id,
            action: 'kick',
            timestamp: date.getTime(),
            //duration: 0,
            mod: mod.id,
            //reason: reason
        };
        let caseDoc = new this.cases(caseObject);
        await caseDoc.save();
    }
}