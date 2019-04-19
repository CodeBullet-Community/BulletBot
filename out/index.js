"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord = __importStar(require("discord.js"));
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l' });
const commands_1 = require("./commands");
const filters_1 = require("./filters");
const youtube_1 = require("./youtube");
const catcher_1 = require("./catcher");
const logger_1 = require("./database/logger");
const database_1 = require("./database/database");
const mStats_1 = require("./database/mStats");
const bot_config_json_1 = require("./bot-config.json");
class Bot {
    static init(client, commands, filters, youtube, database, mStats, catcher, logger) {
        this.client = client;
        this.commands = commands;
        this.filters = filters;
        this.youtube = youtube;
        this.database = database;
        this.mStats = mStats;
        this.catcher = catcher;
        this.logger = logger;
    }
}
var mStats = new mStats_1.MStats();
var database = new database_1.Database();
var logger = new logger_1.Logger();
var client = new discord.Client();
var commands = new commands_1.Commands();
var filters = new filters_1.Filters();
var youtube = new youtube_1.YTWebhookManager();
var catcher = new catcher_1.Catcher();
Bot.init(client, commands, filters, youtube, database, mStats, catcher, logger);
client.on('ready', () => {
    console.info('Bot is ready');
});
client.on('error', error => {
    console.error('from client.on():', error);
});
client.on('message', async (message) => {
    console.log(message);
});
client.on('reconnecting', () => {
    console.warn('Lost client connection. Reconnecting...');
});
client.on('resume', missed => {
    console.info(`Successfully reconnected client. Missed ${missed} events.`);
});
client.on('debug', info => {
    console.log('Client debug:', info);
});
client.on('warn', info => {
    console.warn(info);
});
client.login(bot_config_json_1.botToken);
