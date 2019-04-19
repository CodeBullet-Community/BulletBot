import mongoose = require('mongoose');
import { mStatsAllTimeDoc, mStatsDayDoc, mStatsHourDoc, mStatsAllTimeSchema, mStatsDaySchema, mStatsHourSchema, mStatsHourObject, mStatsObject } from './schemas';

const MS_DAY = 86400000;
const MS_HOUR = MS_DAY / 24;
const MS_MINUTE = MS_HOUR / 60;

export class MStats {
    connection: mongoose.Connection;
    allTime: mongoose.Model<mStatsAllTimeDoc>;
    daily: mongoose.Model<mStatsDayDoc>;
    hourly: {
        model: mongoose.Model<mStatsHourDoc>;
        doc: mStatsHourDoc;
        interval: NodeJS.Timeout;
    }

    constructor(URI: string, authDB: string) {
        this.connection = mongoose.createConnection(URI + '/mStats' + (authDB ? '?authSource=' + authDB : ''), { useNewUrlParser: true });
        this.connection.on('error', console.error.bind(console, 'connection error:'));
        this.connection.once('open', function () {
            console.log('connected to /mStats database');
        });
        this.allTime = this.connection.model("allTime", mStatsAllTimeSchema, "allTime");
        this.daily = this.connection.model("day", mStatsDaySchema, "daily");
        this.init();
    }

    private async init() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        var model = this.connection.model<mStatsHourDoc>("hour", mStatsHourSchema, "hourly");
        var doc = await model.findOne({ day: day, hour: hour }).exec();
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
                    discord: 0,
                    clientAPI: 0,
                    cluster: 0
                }
            });
            doc.save();
        } else {
            console.info("Using existing hour document");
        }

        this.hourly = {
            model: model,
            doc: doc,
            interval: null
        };
        this.hourly.interval = this.createHourInterval(MS_MINUTE, MS_HOUR - (UTC % MS_HOUR) - MS_MINUTE);

        setTimeout(() => {
            this.changeHour();
            setInterval(() => {
                this.changeHour();
            }, MS_HOUR);
        }, MS_HOUR - (UTC % MS_HOUR) + 1000);
    }

    saveHour(doc: mStatsHourDoc) {
        doc.markModified("commands");
        doc.markModified("filters");
        doc.markModified("webhooks");
        return doc.save();
    }

    private createHourInterval(timeout: number, clearTimeout: number = MS_HOUR - MS_MINUTE) {
        var interval = setInterval(this.saveHour, timeout, this.hourly.doc);
        setTimeout(() => {
            clearInterval(interval);
        }, clearTimeout);
        return interval;
    }

    private async changeHour() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        await this.saveHour(this.hourly.doc);
        var oldHourObject = this.hourly.doc.toObject();
        if (oldHourObject.hour > hour) {
            this.changeDay(oldHourObject.day);
        }

        var hourObject: mStatsHourObject = {
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
                discord: 0,
                clientAPI: 0,
                cluster: 0
            }
        };
        this.hourly.doc = new this.hourly.model(hourObject);
        await this.hourly.doc.save();
        this.hourly.interval = this.createHourInterval(MS_MINUTE);
        console.log(`MStats hour from ${oldHourObject.hour} to ${hour}`);
    }

    private async changeDay(day: number) {
        var hourDocs = await this.hourly.model.find({ day: day }).exec();
        var hourObjects = [];
        for (const hour of hourDocs) {
            hourObjects.push(hour.toObject());
            hour.remove();
        }

        var mergedObject: any = this.mergeStats(hourObjects);
        mergedObject.day = day;
        var dayDoc = new this.daily(mergedObject);
        dayDoc.save();

        var allTimeDoc = await this.allTime.findOne();
        if (!allTimeDoc) {
            mergedObject.from = day;
            mergedObject.to = day + MS_DAY;
            allTimeDoc = new this.allTime(mergedObject);
            allTimeDoc.save();
            console.log("made new all time doc");
            return;
        }
        var allTimeObject = this.mergeStats([allTimeDoc.toObject(), dayDoc.toObject()]);
        allTimeDoc.set(allTimeObject);
        allTimeDoc.to = day + MS_DAY;
        allTimeDoc.save();
        console.log("updated all time");
    }

    mergeStats(docs: mStatsObject[]) {
        var merged: mStatsObject = {
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
                discord: 0,
                clientAPI: 0,
                cluster: 0
            }
        };
        for (const doc of docs) {
            merged.messagesRecieved += doc.messagesRecieved;
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

            merged.ping.discord += doc.ping.discord;
            merged.ping.clientAPI += doc.ping.clientAPI;
            merged.ping.cluster += doc.ping.cluster;
        }
        for (const command in merged.commands) {
            merged.commands[command]._resp /= docs.length;
        }
        merged.ping.discord /= docs.length;
        merged.ping.clientAPI /= docs.length;
        merged.ping.cluster /= docs.length;

        return merged;
    }

    logMessageRecieved() {
        this.hourly.doc.messagesRecieved += 1;
    }

    logMessageSend() {
        this.hourly.doc.messagesSend += 1;
    }

    logLog() {
        this.hourly.doc.logs += 1;
    }

    logGuildJoin() {
        this.hourly.doc.guildsJoined += 1;
    }

    logGuildLeave() {
        this.hourly.doc.guildsLeft += 1;
    }

    logError(command?: string) {
        this.hourly.doc.errors += 1;
        if (!this.hourly.doc.commands[command]) {
            this.hourly.doc.commands[command] = { _resp: 0, _errors: 0 };
        }
    }

    logCommandUsage(command: string, subCommand?: string) {
        this.hourly.doc.commandTotal += 1;
        if (!subCommand) {
            subCommand = "_main";
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

    logResponseTime(command: string, requestTimestamp: number) {
        var date = new Date();
        if (!this.hourly.doc.commands[command]) {
            this.hourly.doc.commands[command] = { _errors: 0, _resp: date.getTime() - requestTimestamp };
            return;
        }
        var uses = 0;
        var commandStats = this.hourly.doc.toObject()[command];
        for (const subCommand in commandStats) {
            if (subCommand == "_resp" || subCommand == "_errors") continue;
            uses += commandStats[subCommand];
        }
        var resp = (commandStats._resp * uses) + date.getTime() - requestTimestamp;
        this.hourly.doc.commands[command]._resp = resp / uses + 1;
    }

    logFilterCatch(filter: string) {
        if (this.hourly.doc.filters[filter]) {
            this.hourly.doc.filters[filter] += 1;
        } else {
            this.hourly.doc.filters[filter] = 1;
        }
    }

    logWebhookAction(service: string, action: 'created' | 'changed' | 'deleted') {
        if (!this.hourly.doc.webhooks[service].created) {
            this.hourly.doc.webhooks[service] = { total: 0, created: 0, changed: 0, deleted: 0 };
        }
        this.hourly.doc.webhooks[service][action] += 1;
    }

}