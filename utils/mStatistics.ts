import mongoose = require("mongoose");
import { bot } from "..";

const MS_DAY = 86400000;
const MS_HOUR = MS_DAY / 24;
const MS_MINUTE = MS_HOUR / 60;

interface mStats extends mongoose.Document {
    commands: {
        [key: string]: {
            [key: string]: number;
        };
    };
    messages: number
    filters: {
        [key: string]: number
    };
    webhooks: {
        [key: string]: {
            total: number;
            creates: number;
            changes: number;
            deletes: number;
        }
    };
}
var schemaStruc = {
    commands: mongoose.Schema.Types.Mixed,
    messages: Number,
    filters: mongoose.Schema.Types.Mixed,
    webhooks: {
        youtube: {
            total: Number,
            creates: Number,
            changes: Number,
            deletes: Number
        }
    }
}

interface hourlyMStats extends mStats {
    day: number;
    hour: number;
}
var hourlyStruc: any = Object.assign({}, schemaStruc);
hourlyStruc.day = Number;
hourlyStruc.hour = Number;
const hourlyMStatsSchema = new mongoose.Schema(hourlyStruc);

interface dailyMstats extends mStats {
    day: number;
    hour: number;
}
var dailyStruc: any = Object.assign({}, schemaStruc);
dailyStruc.day = Number;
const dailyMstatsSchema = new mongoose.Schema(dailyStruc);

interface allTimeMStats extends mStats {
    from: number;
    to: number;
}
var allTimeMStats: any = Object.assign({}, schemaStruc);
allTimeMStats.from = Number;
allTimeMStats.to = Number;
const FromToMStatsSchema = new mongoose.Schema(allTimeMStats);



export class MStatistics {
    connection: mongoose.Connection;
    allTime: mongoose.Model<allTimeMStats>;
    daily: mongoose.Model<dailyMstats>;
    hourly: {
        model: mongoose.Model<hourlyMStats>;
        doc: hourlyMStats;
        interval: NodeJS.Timeout;
    }

    /** manages management statistics */
    constructor(URI: string) {
        this.connection = mongoose.createConnection(URI + "/mStatistics?authSource=admin", { useNewUrlParser: true });
        this.connection.on('error', console.error.bind(console, 'connection error:'));
        this.connection.once('open', function () {
            console.log("connected to " + URI + "/mStatistics?authSource=admin")
        });
        this.allTime = this.connection.model<allTimeMStats>("allTime", FromToMStatsSchema, "allTime");
        this.daily = this.connection.model<dailyMstats>("day", dailyMstatsSchema, "daily");
        this._init();
    }

    /** saves hour document */
    saveHour(doc: hourlyMStats) {
        doc.markModified("commands");
        doc.markModified("filters");
        doc.markModified("webhooks");
        return doc.save();
        //console.log("saved hourly mStats");
    }

    /** creates interval with specified timeout and clears it 59min later */
    _createHourInterval(timeout: number, clearTimeout?: number) {
        if (!clearTimeout) {
            clearTimeout = MS_HOUR - MS_MINUTE;
        }
        var interval = setInterval(this.saveHour, timeout, this.hourly.doc);
        setTimeout(() => {
            clearInterval(interval);
        }, clearTimeout);
        return interval;
    }

    /** async constructor function */
    async _init() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        var model = this.connection.model<hourlyMStats>("hour", hourlyMStatsSchema, "hourly");
        var doc = await model.findOne({ day: day, hour: hour }).exec();
        if (!doc) {
            doc = new model({
                day: day,
                hour: hour,
                commands: {},
                messages: 0,
                filters: {},
                webhooks: {}
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
        this.hourly.interval = this._createHourInterval(MS_MINUTE, MS_HOUR - (UTC % MS_HOUR) - 2000);

        setTimeout(() => {
            this.changeHour();
            setInterval(() => {
                this.changeHour();
            }, MS_HOUR);
        }, MS_HOUR - (UTC % MS_HOUR) + 1000);
    }

    /** changes the hour doc and changes the day when needed */
    async changeHour() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        await this.saveHour(this.hourly.doc);
        var oldHour = this.hourly.doc.toObject();
        if (oldHour.hour > hour) {
            this.changeDay(oldHour.day);
        }

        this.hourly.doc = new this.hourly.model({
            day: day,
            hour: hour,
            commands: {},
            messages: 0,
            filters: {},
            webhooks: {}
        });
        await this.hourly.doc.save();
        this.hourly.interval = this._createHourInterval(MS_MINUTE);
        console.log(`MStatistics hour from ${oldHour.hour} to ${hour}`);
    }

    /** changes summaries hour docs */
    async changeDay(day: number) {
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

        var allTime = await this.allTime.findOne();
        var allTimeStats = this.mergeStats([allTime.toObject(), dayDoc.toObject()]);
        allTime.set(allTimeStats);
        allTime.to = day + MS_DAY;
        allTime.save();
        console.log("updated all time");
    }

    /** accumulates stats of docs into a object */
    mergeStats(docs: mStats[]) {
        var merged = { commands: {}, messages: 0, filters: {}, webhooks: {} };
        for (const doc of docs) {
            for (const cmd in doc.commands) {
                if (!merged.commands[cmd]) {
                    merged.commands[cmd] = {};
                }
                for (const subCmd in doc.commands[cmd]) {
                    if (!merged.commands[cmd][subCmd]) {
                        merged.commands[cmd][subCmd] = doc.commands[cmd][subCmd];
                    } else {
                        merged.commands[cmd][subCmd] += doc.commands[cmd][subCmd];
                    }
                }
            }
            merged.messages += doc.messages;
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
        }
        return merged;
    }

    /** registers command usage. if subcommand is left empty, it's gonna add it to "_main" */
    logCommandUsage(command: string, subCommand?: string) {
        if (!subCommand) {
            subCommand = "_main";
        }
        if (!this.hourly.doc.commands) {
            this.hourly.doc.commands = {};
        }
        if (!this.hourly.doc.commands[command]) {
            this.hourly.doc.commands[command] = {};
        }
        if (this.hourly.doc.commands[command][subCommand]) {
            this.hourly.doc.commands[command][subCommand] += 1;
        } else {
            this.hourly.doc.commands[command][subCommand] = 1;
        }
    }

    /** registers processed message */
    logMessage() {
        this.hourly.doc.messages += 1;
    }

    /** registers filter catch */
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

    logWebhookAction(bot: bot, service: string, action: "creates" | "deletes" | "changes") {
        if (!bot.webhooks.serviceNames.includes(service)) {
            console.warn(`unknown service "${service}" input to logWebhookAction()`);
            return;
        }
        if (!this.hourly.doc.webhooks) {
            this.hourly.doc.webhooks = {};
        }
        if (!this.hourly.doc.webhooks[service].creates) {
            this.hourly.doc.webhooks[service] = { total: 0, creates: 0, changes: 0, deletes: 0 };
        }
        this.hourly.doc.webhooks[service][action] += 1;
    }

}