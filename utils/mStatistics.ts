import mongoose = require("mongoose");

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
            modified: number;
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
            modified: Number,
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
        this.connection = mongoose.createConnection(URI + "/mStatistics", { useNewUrlParser: true });
        this.connection.on('error', console.error.bind(console, 'connection error:'));
        this.connection.once('open', function () {
            console.log("connected to " + URI + "/mStatistics")
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
        doc.save();
        //console.log("saved hourly mStats");
    }

    /** creates interval with specified timeout and clears it 59min58sec later */
    _createHourInterval(timeout: number, clearTimeout?: number) {
        if (!clearTimeout) {
            clearTimeout = MS_HOUR - 2000;
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
    changeHour() {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        this.saveHour(this.hourly.doc);
        var oldHour = this.hourly.doc.toObject();
        if (oldHour == 23) {
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
        this.hourly.doc.save();
        this.hourly.interval = this._createHourInterval(MS_MINUTE);
        console.log(`MStatistics hour from ${oldHour.hour} to ${hour}`);
    }

    /** changes summarises hour docs */
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
        var alltimeStats = this.mergeStats([allTime.toObject(), dayDoc.toObject()]);
        allTime.set(alltimeStats);
        allTime.to = day + MS_DAY;
        allTime.save();
        console.log("updated all time");
    }

    /** accumalates stats of docs into a object */
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

}