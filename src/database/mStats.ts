import mongoose = require('mongoose');
import { mStatsAllTimeDoc, mStatsDayDoc, mStatsHourDoc, mStatsAllTimeSchema, mStatsDaySchema, mStatsHourSchema, mStatsHourObject, mStatsObject } from './schemas';
import { Bot } from '..';
import { durations, toNano } from '../utils/time';

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
     * Creates an instance of MStats, connects to the database and starts all timers. It calls the private async init function.
     * 
     * @param {string} URI database URL with auth already in it
     * @param {string} authDB name of auth database
     * @memberof MStats
     */
    constructor(URI: string, authDB: string) {
        this.connection = mongoose.createConnection(URI + '/mStats' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        this.connection.on('error', console.error.bind(console, 'connection error:'));
        this.connection.once('open', function () {
            console.log('connected to /mStats database');
        });
        this.allTime = this.connection.model('allTime', mStatsAllTimeSchema, 'allTime');
        this.daily = this.connection.model('day', mStatsDaySchema, 'daily');
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
        var doc = await model.findOne({ day: day, hour: hour }).exec(); // looks if it can find an existing hour document
        var pingTestCounter = 1;
        if (!doc) {
            doc = new model({
                day: day,
                hour: hour,
                messagesRecieved: 0,
                messagesSend: 0,
                logs: 0,
                guildsJoined: 0,
                guildsLeft: 0,
                guildsTotal: 0,
                errorsTotal: 0,
                commandTotal: 0,
                commands: {},
                filters: {},
                webhooks: {},
                ping: {
                    clientAPI: 0,
                    cluster: 0
                }
            });
            doc.markModified('commands');
            doc.markModified('filters');
            doc.markModified('webhooks');
            doc.save();
            pingTestCounter = 0;
        } else {
            console.info('Using existing hour document');
        }

        this.hourly = {
            model: model,
            doc: doc,
            pingTestCounter: pingTestCounter,
            interval: null
        };
        this.hourly.interval = this.createHourInterval(durations.minute, durations.hour - (UTC % durations.hour) - durations.minute);

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
        // ping stats
        var ping = hourly.doc.toObject().ping;
        var clientAPI = Math.round(Bot.client.ping);
        var cluster = await Bot.database.ping();
        hourly.doc.ping.clientAPI = ((ping.clientAPI * hourly.pingTestCounter) + clientAPI) / (hourly.pingTestCounter + 1);
        hourly.doc.ping.cluster = ((ping.cluster * hourly.pingTestCounter) + cluster) / (hourly.pingTestCounter + 1);
        hourly.pingTestCounter++;

        // total stats
        hourly.doc.guildsTotal = Bot.client.guilds.size;
        if (!hourly.doc.webhooks) hourly.doc.webhooks = {};
        if (!hourly.doc.webhooks.youtube) {
            hourly.doc.webhooks.youtube = { total: 0, created: 0, deleted: 0, changed: 0 };
        }
        hourly.doc.webhooks.youtube.total = await Bot.youtube.webhooks.countDocuments().exec();

        // marks nested objects as modified so they also get saved
        hourly.doc.markModified('commands');
        hourly.doc.markModified('filters');
        hourly.doc.markModified('webhooks');
        return hourly.doc.save();
    }

    /**
     * creates an interval that calls the saveHour function. By default the interval gets cleared after 59 min. 
     * The clear thing exists so the interval doesn't save the doc at the same time as other functions, which creates an exception.
     *
     * @private
     * @param {number} timeout interval in which to call saveHour
     * @param {number} [clearTimeout=durations.day - durations.minute] when to clear interval (default 59min)
     * @returns
     * @memberof MStats
     */
    private createHourInterval(timeout: number, clearTimeout: number = durations.day - durations.minute) {
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

        var hourObject: mStatsHourObject = {
            day: day,
            hour: hour,
            messagesReceived: 0,
            messagesSend: 0,
            logs: 0,
            guildsJoined: 0,
            guildsLeft: 0,
            guildsTotal: 0,
            errorsTotal: 0,
            commandTotal: 0,
            commands: {},
            filters: {},
            webhooks: {},
            ping: {
                clientAPI: 0,
                cluster: 0
            }
        };
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
        var hourObjects = [];
        for (const hour of hourDocs) { // loads all hour docs and deletes them
            hourObjects.push(hour.toObject());
            hour.remove();
        }

        // merges them and creates a new day doc
        var mergedObject: any = this.mergeStats(hourObjects);
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
        var allTimeObject = this.mergeStats([allTimeDoc.toObject(), dayDoc.toObject()]); // merges day doc with existing all time
        allTimeDoc.set(allTimeObject);
        allTimeDoc.to = day + durations.day; // updates the to timestamp
        await allTimeDoc.save();
        console.log('updated all time');
    }

    /**
     * merges an array of mStats objects into a single on
     *
     * @param {mStatsObject[]} docs
     * @returns
     * @memberof MStats
     */
    mergeStats(docs: mStatsObject[]) {
        var merged: mStatsObject = {
            messagesReceived: 0,
            messagesSend: 0,
            logs: 0,
            guildsJoined: 0,
            guildsLeft: 0,
            guildsTotal: 0,
            errorsTotal: 0,
            commandTotal: 0,
            commands: {},
            filters: {},
            webhooks: {},
            ping: {
                clientAPI: 0,
                cluster: 0
            }
        };
        for (const doc of docs) {
            merged.messagesReceived += doc.messagesReceived;
            merged.messagesSend += doc.messagesSend;
            merged.logs += doc.logs;
            merged.guildsJoined += doc.guildsJoined;
            merged.guildsLeft += doc.guildsLeft;
            if (merged.guildsTotal < doc.guildsTotal) merged.guildsTotal = doc.guildsTotal;
            merged.errorsTotal += doc.errorsTotal;
            merged.commandTotal += doc.commandTotal;

            for (const cmd in doc.commands) {
                if (!merged.commands[cmd]) {
                    merged.commands[cmd] = { _errors: 0, _resp: 0 };
                }
                for (const subCmd in doc.commands[cmd]) {
                    if (!merged.commands[cmd][subCmd]) {
                        merged.commands[cmd][subCmd] = doc.commands[cmd][subCmd];
                    } else {
                        merged.commands[cmd][subCmd] += doc.commands[cmd][subCmd];
                    }
                }
            }

            for (const filter in doc.filters) {
                if (!merged.filters[filter]) {
                    merged.filters[filter] = doc.filters[filter];
                } else {
                    merged.filters[filter] += doc.filters[filter];
                }
            }

            for (const service in doc.webhooks) {
                if (!merged.webhooks[service]) {
                    merged.webhooks[service] = doc.webhooks[service];
                } else {
                    for (const key in doc.webhooks[service]) {
                        merged.webhooks[service][key] += doc.webhooks[service][key];
                    }
                }
            }

            merged.ping.clientAPI += doc.ping.clientAPI;
            merged.ping.cluster += doc.ping.cluster;
        }
        for (const command in merged.commands) {
            merged.commands[command]._resp /= docs.length;
        }
        merged.ping.clientAPI /= docs.length;
        merged.ping.cluster /= docs.length;

        return merged;
    }

    /**
     * logs a received message
     *
     * @memberof MStats
     */
    logMessageReceived() {
        this.hourly.doc.messagesReceived += 1;
    }

    /**
     * logs a message send
     *
     * @memberof MStats
     */
    logMessageSend() {
        this.hourly.doc.messagesSend += 1;
    }

    /**
     * logs a log logged
     *
     * @memberof MStats
     */
    logLog() {
        this.hourly.doc.logs += 1;
    }

    /**
     * logs a guild join
     *
     * @memberof MStats
     */
    logGuildJoin() {
        this.hourly.doc.guildsJoined += 1;
    }

    /**
     * logs a guild leave
     *
     * @memberof MStats
     */
    logGuildLeave() {
        this.hourly.doc.guildsLeft += 1;
    }

    /**
     * logs an error and also and error in a specific command when specified
     *
     * @param {string} [command] command name
     * @memberof MStats
     */
    logError(command?: string) {
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
    }

    /**
     * logs a command usage
     *
     * @param {string} command command name
     * @param {string} [subCommand] sub command name (like 'list' or 'remove')
     * @memberof MStats
     */
    logCommandUsage(command: string, subCommand?: string) {
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
        if (!this.hourly.doc.webhooks) {
            this.hourly.doc.webhooks = {};
        }
        if (!this.hourly.doc.webhooks[service] || !this.hourly.doc.webhooks[service].created) {
            this.hourly.doc.webhooks[service] = { total: 0, created: 0, changed: 0, deleted: 0 };
        }
        this.hourly.doc.webhooks[service][action] += 1;
    }

}