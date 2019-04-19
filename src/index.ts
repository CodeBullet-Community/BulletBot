import * as discord from 'discord.js';
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l' });
import exitHook = require('exit-hook');
import { Commands } from './commands';
import { Filters } from './filters';
import { YTWebhookManager } from './youtube';
import { Catcher } from './catcher';
import { Logger } from './database/logger';
import { Database } from './database/database';
import { MStats } from './database/mStats';
import { botToken } from './bot-config.json';

class Bot {
    static client: discord.Client;
    static commands: Commands;
    static filters: Filters;
    static youtube: YTWebhookManager;
    static database: Database;
    static mStats: MStats;
    static catcher: Catcher;
    static logger: Logger;

    static init(client: discord.Client, commands: Commands, filters: Filters, youtube: YTWebhookManager,
        database: Database, mStats: MStats, catcher: Catcher, logger: Logger) {
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

var mStats = new MStats();
var database = new Database();
var logger = new Logger();
var client = new discord.Client();
var commands = new Commands();
var filters = new Filters();
var youtube = new YTWebhookManager();
var catcher = new Catcher();
Bot.init(client, commands, filters, youtube, database, mStats, catcher, logger);

client.on('ready', () => {
    console.info('Bot is ready');
});

client.on('error', error => {
    console.error('from client.on():', error);
});

client.on('message', async message => {
    console.log(message);
});

client.on('reconnecting', () => {
    console.warn('Lost client connection. Reconnecting...');
})

client.on('resume', missed => {
    console.info(`Successfully reconnected client. Missed ${missed} events.`)
})

client.on('debug', info => {
    console.log('Client debug:', info);
});

client.on('warn', info => {
    console.warn(info);
})

client.login(botToken);