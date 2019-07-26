import mongoose = require('mongoose');
import { mStatsAllTimeDoc, mStatsDayDoc, mStatsHourDoc, mStatsAllTimeSchema, mStatsDaySchema, mStatsHourSchema, mStatsHourObject, mStatsObject, errorDoc, errorSchema, mStatsDayObject, megalogFunctions, createEmptyMStatsObject } from './schemas';
import { Bot } from '..';
import { durations, toNano } from '../utils/time';
import crypto = require('crypto');

/**
 * Manages all connections and documents in the mStats database. It's a very independent class with only minimal actual input (besides the action logging) required.
 * Each hour it accumulates the stats into one doc. A few seconds after 00:00 UTC it collects all hours and merges them into a day doc. This day doc will also be used to update the all time doc.
 * All hours from the last day will be deleted so there will never be more the 25 hour docs  (the next hour doc might get created before the others get deleted).
 *
 * @export
 * @class MStats
 */
export class MStats {
    /**
     * connection to mStats database
     *
     * @type {mongoose.Connection}
     * @memberof MStats
     */
    connection: mongoose.Connection;
    /**
     * model for allTime collection
     *
     * @type {mongoose.Model<mStatsAllTimeDoc>}
     * @memberof MStats
     */
    allTime: mongoose.Model<mStatsAllTimeDoc>;
    /**
     * model for daily collection
     *
     * @type {mongoose.Model<mStatsDayDoc>}
     * @memberof MStats
     */
    daily: mongoose.Model<mStatsDayDoc>;
    hourly: {
        model: mongoose.Model<mStatsHourDoc>;
        doc: mStatsHourDoc;
        pingTestCounter: number;
        interval: NodeJS.Timeout;
    }
    /**
     * model for errors collection
     *
     * @type {mongoose.Model<errorDoc>}
     * @memberof MStats
     */
    errors: mongoose.Model<errorDoc>;

    /**
     * Creates an instance of MStats, connects to the database and starts all timers. It calls the private async init function.
     * 
     * @param {string} URI database URL with auth already in it
     * @param {string} authDB name of auth database
     * @memberof MStats
     */
    constructor(URI: string, authDB: string) {
        this.connection = mongoose.createConnection(URI + '/mStats' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        this.connection.on('error', error => {
            console.error('connection error:', error);
            Bot.mStats.logError(error);
        });
        this.connection.once('open', function () {
            console.log('connected to /mStats database');
        });
        this.allTime = this.connection.model('allTime', mStatsAllTimeSchema, 'allTime');
        this.daily = this.connection.model('day', mStatsDaySchema, 'daily');
        this.errors = this.connection.model('error', errorSchema, 'errors');
        this.init();
    }

    /**
     * a async constructor function, which makes it easier to code with promises
     *
     * @private
     * @memberof MStats
     */
    private async init() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % durations.day);
        var hour = date.getUTCHours();

        var model = this.connection.model<mStatsHourDoc>('hour', mStatsHourSchema, 'hourly');

        // checks if there are hours saved from other days
        let existingDays: number[] = await model.distinct('day').exec();
        if (existingDays.includes(day)) existingDays.splice(existingDays.indexOf(day), 1);
        for (const existingDay of existingDays) {
            if (!await this.daily.findOne({ day: existingDay })) { // only make a new day doc if there isn't one
                let hourObjects: mStatsHourObject[] = (await model.find({ day: existingDay }).exec()).map(x => x.toObject());

                let mergedObject: any;
                if (hourObjects.length != 1) {
                    // get the newest hour doc
                    let newestIndex = 0;
                    let newestHour = hourObjects[newestIndex];
                    hourObjects.forEach((x, i) => {
                        if (x.hour > newestHour.hour) {
                            newestHour = x;
                            newestIndex = i;
                        }
                    });
                    hourObjects.splice(newestIndex, 1);

                    mergedObject = this.mergeStats(hourObjects, newestHour);
                    mergedObject.day = existingDay;
                } else {
                    mergedObject = hourObjects[0];
                    delete mergedObject.day;
                }

                await new this.daily(mergedObject).save();
            }
            model.deleteMany({ day: existingDay }).exec();
        }
        console.info(`Resolved ${existingDays.length} days in hourly collection.`);

        var doc = await model.findOne({ day: day, hour: hour }).exec(); // looks if it can find an existing hour document
        var pingTestCounter = 1;
        if (!doc) {
            let docObject: any = createEmptyMStatsObject();
            docObject.day = day;
            docObject.hour = hour;
            doc = new model(docObject);
            doc.markModified('commands');
            doc.markModified('filters');
            doc.markModified('webhooks');
            doc.save();
            pingTestCounter = 0;
        } else {
            // old mStats object don't have a megalog property
            if (!doc.megalog)
                doc.megalog = createEmptyMStatsObject().megalog;
            if (!doc.megalog.enabled)
                doc.megalog.enabled = createEmptyMStatsObject().megalog.enabled;
            console.info('Using existing hour document');
        }

        this.hourly = {
            model: model,
            doc: doc,
            pingTestCounter: pingTestCounter,
            interval: null
        };
        this.hourly.interval = this.createHourInterval(durations.minute / 6, durations.hour - (UTC % durations.hour) - durations.minute);

        setTimeout(() => { // timeout and interval for the next hour and all hours after that
            this.changeHour();
            setInterval(() => {
                this.changeHour();
            }, durations.hour);
        }, durations.hour - (UTC % durations.hour) + 1000);
    }

    /**
     * saves the hour document and fill out total and ping stats
     *
     * @param {{ model: mongoose.Model<mStatsHourDoc>; doc: mStatsHourDoc; pingTestCounter: number; interval: NodeJS.Timeout;}} hourly hourly property if the class. It need this, because it can't get it when it's in a timeout.
     * @returns
     * @memberof MStats
     */
    async saveHour(hourly: {
        model: mongoose.Model<mStatsHourDoc>; doc: mStatsHourDoc;
        pingTestCounter: number; interval: NodeJS.Timeout;
    }) {
        try {
            // ping stats
            var ping = hourly.doc.toObject().ping;
            var clientAPI = Math.round(Bot.client.ping);
            var cluster = await Bot.database.ping();
            hourly.doc.ping.clientAPI = ((ping.clientAPI * hourly.pingTestCounter) + clientAPI) / (hourly.pingTestCounter + 1);
            hourly.doc.ping.cluster = ((ping.cluster * hourly.pingTestCounter) + cluster) / (hourly.pingTestCounter + 1);
            hourly.pingTestCounter++;

            // total stats
            // total guilds
            hourly.doc.guildsTotal = Bot.client.guilds.size;
            // total youtube webhooks
            if (!hourly.doc.webhooks) hourly.doc.webhooks = {};
            if (!hourly.doc.webhooks.youtube) {
                hourly.doc.webhooks.youtube = { total: 0, created: 0, deleted: 0, changed: 0 };
            }
            hourly.doc.webhooks.youtube.total = await Bot.youtube.webhooks.countDocuments().exec();
            // total enabled megalog functions
            for (const megalogFunction of megalogFunctions.all) {
                let query = {};
                query[megalogFunction] = { $exists: true };
                hourly.doc.megalog.enabled[megalogFunction] = await Bot.database.mainDB.megalogs.countDocuments(query).exec();
            }

            // marks nested objects as modified so they also get saved
            for (const keys in hourly.doc.toObject()) {
                hourly.doc.markModified(keys);
            }
            return await hourly.doc.save();
        } catch (e) {
            console.error("from saveHour():", e, hourly);
            Bot.mStats.logError(e);
        }
    }

    /**
     * creates an interval that calls the saveHour function. By default the interval gets cleared after 59 min. 
     * The clear thing exists so the interval doesn't save the doc at the same time as other functions, which creates an exception.
     *
     * @private
     * @param {number} timeout interval in which to call saveHour
     * @param {number} [clearTimeout=durations.hour - durations.minute] when to clear interval (default 59min)
     * @returns
     * @memberof MStats
     */
    private createHourInterval(timeout: number, clearTimeout: number = durations.hour - durations.minute) {
        var interval = setInterval(this.saveHour, timeout, this.hourly);
        setTimeout(() => {
            clearInterval(interval);
        }, clearTimeout);
        return interval;
    }

    /**
     * changes the hour doc and calls the changeDay function if the previous hour is bigger then the next
     *
     * @private
     * @memberof MStats
     */
    private async changeHour() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % durations.day);
        var hour = date.getUTCHours();

        await this.saveHour(this.hourly);
        var oldHourObject = this.hourly.doc.toObject();
        if (oldHourObject.hour > hour) { // calls change day if the previous our is bigger then the next one
            await this.changeDay(oldHourObject.day);
        }

        var hourObject: any = createEmptyMStatsObject();
        hourObject.day = day;
        hourObject.hour = hour;

        this.hourly.doc = new this.hourly.model(hourObject);
        await this.saveHour(this.hourly);
        this.hourly.pingTestCounter = 0; // resets ping test counter because there weren't any ping test save into this document
        this.hourly.interval = this.createHourInterval(durations.minute); // creates another hour save interval because the other one was cleared
        console.log(`MStats hour from ${oldHourObject.hour} to ${hour}`);
    }

    /**
     * merges all hour documents and saves them into a day doc. It deletes all old hour docs and also updates the all time doc.
     *
     * @param {number} day hour of which day to merge
     * @returns
     * @memberof MStats
     */
    async changeDay(day: number) {
        var hourDocs = await this.hourly.model.find({ day: day }).exec();
        var hourObjects: mStatsHourObject[] = [];
        let newestHourObject: mStatsHourObject;
        for (const hour of hourDocs) { // loads all hour docs and deletes them
            let hourObject = hour.toObject();
            if (!newestHourObject || newestHourObject.hour < hourObject.hour)
                newestHourObject = hourObject;
            hourObjects.push(hourObject);
            hour.remove();
        }

        // merges them and creates a new day doc
        var mergedObject: any = this.mergeStats(hourObjects, newestHourObject);
        mergedObject.day = day;
        var dayDoc = new this.daily(mergedObject);
        dayDoc.markModified('commands');
        dayDoc.markModified('filters');
        dayDoc.markModified('webhooks');
        await dayDoc.save();

        var allTimeDoc = await this.allTime.findOne();
        if (!allTimeDoc) { // make a new all time doc if no one was found
            mergedObject.from = day;
            mergedObject.to = day + durations.day;
            allTimeDoc = new this.allTime(mergedObject);
            allTimeDoc.markModified('commands');
            allTimeDoc.markModified('filters');
            allTimeDoc.markModified('webhooks');
            allTimeDoc.save();
            console.log('made new all time doc');
            return;
        }
        let dayObject: mStatsDayObject = dayDoc.toObject();
        var allTimeObject = this.mergeStats([allTimeDoc.toObject(), dayObject], dayObject); // merges day doc with existing all time
        allTimeDoc.set(allTimeObject);
        allTimeDoc.to = day + durations.day; // updates the to timestamp
        await allTimeDoc.save();
        console.log(`updated all time. ${hourObjects.length} hours recorded for day ${day}`);
    }

    /**
     * merges an array of mStats objects into a single on
     *
     * @param {mStatsObject[]} docs
     * @param {mStatsObject} newestDoc the newest doc in the array. Is used to define guildsTotal and webhooks.[service].total properties
     * @returns
     * @memberof MStats
     */
    mergeStats(docs: mStatsObject[], newestDoc: mStatsObject) {
        var mergedDoc: mStatsObject = createEmptyMStatsObject();
        for (const doc of docs) {
            mergedDoc.messagesReceived += doc.messagesReceived;
            mergedDoc.messagesSend += doc.messagesSend;
            mergedDoc.logs += doc.logs;
            mergedDoc.guildsJoined += doc.guildsJoined;
            mergedDoc.guildsLeft += doc.guildsLeft;
            mergedDoc.errorsTotal += doc.errorsTotal;
            mergedDoc.commandTotal += doc.commandTotal;

            for (const cmd in doc.commands) {
                if (!mergedDoc.commands[cmd]) {
                    mergedDoc.commands[cmd] = { _errors: 0, _resp: 0 };
                }
                for (const subCmd in doc.commands[cmd]) {
                    if (!mergedDoc.commands[cmd][subCmd]) {
                        mergedDoc.commands[cmd][subCmd] = doc.commands[cmd][subCmd];
                    } else {
                        mergedDoc.commands[cmd][subCmd] += doc.commands[cmd][subCmd];
                    }
                }
            }

            for (const filter in doc.filters) {
                if (!mergedDoc.filters[filter]) {
                    mergedDoc.filters[filter] = doc.filters[filter];
                } else {
                    mergedDoc.filters[filter] += doc.filters[filter];
                }
            }

            for (const service in doc.webhooks) {
                if (!mergedDoc.webhooks[service]) {
                    mergedDoc.webhooks[service] = doc.webhooks[service];
                } else {
                    for (const key in doc.webhooks[service]) {
                        mergedDoc.webhooks[service][key] += doc.webhooks[service][key];
                    }
                }
            }

            mergedDoc.ping.clientAPI += doc.ping.clientAPI;
            mergedDoc.ping.cluster += doc.ping.cluster;

            if (doc.megalog) // old mStats doc don't have this property
                for (const megalogFunction in doc.megalog.logged)
                    mergedDoc.megalog.logged[megalogFunction] += doc.megalog.logged[megalogFunction];
        }
        for (const command in mergedDoc.commands) {
            mergedDoc.commands[command]._resp /= docs.length;
        }
        mergedDoc.ping.clientAPI /= docs.length;
        mergedDoc.ping.cluster /= docs.length;

        mergedDoc.guildsTotal = newestDoc.guildsTotal;
        for (const service in mergedDoc.webhooks) {
            if (newestDoc.webhooks[service] && newestDoc.webhooks[service].total) {
                mergedDoc.webhooks[service].total = newestDoc.webhooks[service].total;
            } else {
                mergedDoc.webhooks[service].total = 0;
            }
        }
        if (newestDoc.megalog) // old mStats doc don't have this property
            mergedDoc.megalog.enabled = Object.assign({}, newestDoc.megalog.enabled);

        return mergedDoc;
    }

    /**
     * logs a received message
     *
     * @memberof MStats
     */
    logMessageReceived() {
        if (!this.hourly) return;
        if (this.hourly.doc.messagesReceived) {
            this.hourly.doc.messagesReceived += 1;
        } else {
            this.hourly.doc.messagesReceived = 1;
        }
    }

    /**
     * logs a message send
     *
     * @memberof MStats
     */
    logMessageSend() {
        if (!this.hourly) return;
        this.hourly.doc.messagesSend += 1;
    }

    /**
     * logs a log logged
     *
     * @memberof MStats
     */
    logLog() {
        if (!this.hourly) return;
        this.hourly.doc.logs += 1;
    }

    /**
     * logs a guild join
     *
     * @memberof MStats
     */
    logGuildJoin() {
        if (!this.hourly) return;
        this.hourly.doc.guildsJoined += 1;
    }

    /**
     * logs a guild leave
     *
     * @memberof MStats
     */
    logGuildLeave() {
        if (!this.hourly) return;
        this.hourly.doc.guildsLeft += 1;
    }

    /**
     * logs an error and also and error in a specific command when specified.
     * Groups same errors together.
     *  
     * @param {Error} error the actual error
     * @param {string} [command] command name
     * @returns the updated/created error doc
     * @memberof MStats
     */
    async logError(error: Error, command?: string) {
        if (!this.hourly) return;
        this.hourly.doc.errorsTotal += 1;
        if (command) {
            if (!this.hourly.doc.commands) {
                this.hourly.doc.commands = {};
            }
            if (!this.hourly.doc.commands[command]) {
                this.hourly.doc.commands[command] = { _resp: 0, _errors: 0 };
            } else {
                this.hourly.doc.commands[command]._errors += 1;
            }
        }

        let date = new Date();
        var stringifiedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        var md5 = crypto.createHash('md5').update(stringifiedError).digest('hex');
        let errorDoc = await this.errors.findOne({ md5: md5 }).exec();
        if (!errorDoc) {
            errorDoc = new this.errors({
                first: date.getTime(),
                last: date.getTime(),
                md5: md5,
                count: 1,
                error: JSON.parse(stringifiedError)
            });
        } else {
            errorDoc.last = date.getTime();
            errorDoc.count += 1;
        }
        return await errorDoc.save();
    }

    /**
     * logs a command usage
     *
     * @param {string} command command name
     * @param {string} [subCommand] sub command name (like 'list' or 'remove')
     * @memberof MStats
     */
    logCommandUsage(command: string, subCommand?: string) {
        if (!this.hourly) return;
        this.hourly.doc.commandTotal += 1;
        if (!subCommand) {
            subCommand = '_main';
        }
        if (!this.hourly.doc.commands) {
            this.hourly.doc.commands = {};
        }
        if (!this.hourly.doc.commands[command]) {
            this.hourly.doc.commands[command] = { _resp: 0, _errors: 0 };
        }
        if (this.hourly.doc.commands[command][subCommand]) {
            this.hourly.doc.commands[command][subCommand] += 1;
        } else {
            this.hourly.doc.commands[command][subCommand] = 1;
        }
    }

    /**
     * logs responds time of a command. This doesn't include the ping, but only the time between receiving the message and sending the first response.
     *
     * @param {string} command command name
     * @param {number} requestTime timestamp when the bot received the message
     * @returns
     * @memberof MStats
     */
    logResponseTime(command: string, requestTime: [number, number]) {
        if (!this.hourly) return;
        var latency = toNano(process.hrtime(requestTime));
        if (!this.hourly.doc.commands) {
            this.hourly.doc.commands = {};
        }
        if (!this.hourly.doc.commands[command]) {
            this.hourly.doc.commands[command] = { _errors: 0, _resp: latency };
            return;
        }
        var uses = 0;
        var commandStats = this.hourly.doc.toObject().commands[command];
        for (const subCommand in commandStats) { // counts usage of a command so it knows how many times the response time has been logged
            if (subCommand == '_resp' || subCommand == '_errors') continue;
            uses += commandStats[subCommand];
        }
        var resp = (commandStats._resp * uses) + latency;
        this.hourly.doc.commands[command]._resp = resp / (uses + 1);
    }

    /**
     * logs a filter catch of a specific filter
     *
     * @param {string} filter filter name
     * @memberof MStats
     */
    logFilterCatch(filter: string) {
        if (!this.hourly) return;
        if (!this.hourly.doc.filters) {
            this.hourly.doc.filters = {};
        }
        if (this.hourly.doc.filters[filter]) {
            this.hourly.doc.filters[filter] += 1;
        } else {
            this.hourly.doc.filters[filter] = 1;
        }
    }

    /**
     * logs webhook action
     *
     * @param {string} service service name
     * @param {('created' | 'changed' | 'deleted')} action created/changed/deleted
     * @memberof MStats
     */
    logWebhookAction(service: string, action: 'created' | 'changed' | 'deleted') {
        if (!this.hourly) return;
        if (!this.hourly.doc.webhooks) {
            this.hourly.doc.webhooks = {};
        }
        if (!this.hourly.doc.webhooks[service] || !this.hourly.doc.webhooks[service].created) {
            this.hourly.doc.webhooks[service] = { total: 0, created: 0, changed: 0, deleted: 0 };
        }
        this.hourly.doc.webhooks[service][action] += 1;
    }

    /**
     * logs a log that the megalogger created
     *
     * @param {string} megalogFunction which function made the log
     * @returns
     * @memberof MStats
     */
    logMegalogLog(megalogFunction: 'channelCreate' | 'channelDelete' | 'channelUpdate' | 'ban' | 'unban' |
        'memberJoin' | 'memberLeave' | 'nicknameChange' | 'memberRolesChange' | 'guildNameChange' |
        'messageDelete' | 'attachmentCache' | 'messageEdit' | 'reactionAdd' | 'reactionRemove' |
        'roleCreate' | 'roleDelete' | 'roleUpdate' | 'voiceTransfer' | 'voiceMute' | 'voiceDeaf') {
        if (!this.hourly) return;
        if (!this.hourly.doc.megalog)
            this.hourly.doc.megalog = createEmptyMStatsObject().megalog;
        if (!this.hourly.doc.megalog.logged)
            this.hourly.doc.megalog.logged = createEmptyMStatsObject().megalog.logged;
        if (!megalogFunctions.all.includes(megalogFunction)) {
            console.warn(`Invalid input in mStats.logMegalogLog function: ${megalogFunction}`);
            return;
        }
        if (isNaN(this.hourly.doc.megalog.logged[megalogFunction])) {
            this.hourly.doc.megalog.logged[megalogFunction] = 1;
        } else {
            this.hourly.doc.megalog.logged[megalogFunction] += 1;
        }

    }

}