import mongoose = require("mongoose");

const MS_DAY = 86400000;
const MS_HOUR = MS_DAY / 24;

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
    allTime: mongoose.Model<allTimeMStats>;
    daily: mongoose.Model<dailyMstats>;
    hourly: {
        model: mongoose.Model<hourlyMStats>;
        doc: hourlyMStats;
    }

    /** manages management statistics */
    constructor(URI: string) {
        var connection = mongoose.createConnection(URI + "/mStatistics", { useNewUrlParser: true });
        connection.on('error', console.error.bind(console, 'connection error:'));
        connection.once('open', function () {
            console.log("connected to " + URI + "/mStatistics")
        });
        this.allTime = connection.model<allTimeMStats>("allTime", FromToMStatsSchema, "allTime");
        this.daily = connection.model<dailyMstats>("day", FromToMStatsSchema, "daily");
        this._init(connection);
    }

    /** async constructor function */
    async _init(connection: mongoose.Connection) {
        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        var model = connection.model<hourlyMStats>("hour", hourlyMStatsSchema, "hourly");
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
        setInterval(() => {
            this.hourly.doc.markModified("commands");
            this.hourly.doc.markModified("filters");
            this.hourly.doc.markModified("webhooks");
            this.hourly.doc.save();
            //console.log("saved hourly mStats");
        }, 60000);

        this.hourly = {
            model: model,
            doc: doc
        };

        setTimeout(() => {
            this.changeHour();
            setInterval(() => {
                this.changeHour();
            }, MS_HOUR);
        }, MS_HOUR - (UTC % MS_HOUR) + 1000);
    }

    /** changes the hour doc and changes the day when needed */
    changeHour() {
        this.hourly.doc.save();
        var oldHour = this.hourly.doc.toObject();
        if (oldHour == 23) {
            this.changeDay(oldHour.day);
        }

        var date = new Date();
        var UTC = date.getTime();
        var day = UTC - (UTC % MS_DAY);
        var hour = date.getUTCHours();

        this.hourly.doc = new this.hourly.model({
            day: day,
            hour: hour,
            commands: {},
            messages: 0,
            filters: {},
            webhooks: {}
        });
        this.hourly.doc.save();
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
        var alltimeStats = this.mergeStats([allTime.toObject(),dayDoc.toObject()]);
        allTime.set(alltimeStats);
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
        if(!this.hourly.doc.commands){
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
    logMessage(){
        this.hourly.doc.messages += 1;
    }

    /** registers filter catch */
    logFilterCatch(filter:string){
        if(!this.hourly.doc.filters){
            this.hourly.doc.filters = {};
        }
        if(this.hourly.doc.filters[filter]){
            this.hourly.doc.filters[filter] += 1;
        }else{
            this.hourly.doc.filters[filter] = 1;
        }
    }

}