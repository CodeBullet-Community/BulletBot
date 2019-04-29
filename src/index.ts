import * as discord from 'discord.js';
import exitHook = require('exit-hook');
import { Commands } from './commands';
import { Filters } from './filters';
import { YTWebhookManager } from './youtube';
import { Catcher } from './catcher';
import { Logger } from './database/logger';
import { Database } from './database/database';
import { MStats } from './database/mStats';
import { botToken, DBURI, callbackPort } from './bot-config.json';
import { permLevels, getPermLevel } from './utils/permissions';
import { logTypes } from './database/schemas';
import { durations } from './utils/time';

// add console logging info
require('console-stamp')(console, {
    metadata: function () {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function (_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack: any = err.stack;
        Error.prepareStackTrace = orig;

        var output = `[${stack[1].getFileName().split("\\").pop()}:${stack[1].getFunctionName()}:${stack[1].getLineNumber()}]   `;
        for (; output.length < 25; output += ' ') { }
        return output;
    },
    pattern: 'dd/mm/yyyy HH:MM:ss.l'
});

process.on('uncaughtException', (error) => {
    if (Bot.mStats)
        Bot.mStats.logError(error);
    console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
    var error = new Error('Unhandled Rejection. Reason: ' + reason);
    if (Bot.mStats)
        Bot.mStats.logError(error);
    console.error(error);
});

/**
 * static class that holds objects. This is made so you can call everything from everywhere
 *
 * @export
 * @class Bot
 */
export class Bot {
    static client: discord.Client;
    static commands: Commands;
    static filters: Filters;
    static youtube: YTWebhookManager;
    static database: Database;
    static mStats: MStats;
    static catcher: Catcher;
    static logger: Logger;

    /**
     * the static version of a constructor
     *
     * @static
     * @param {discord.Client} client
     * @param {Commands} commands
     * @param {Filters} filters
     * @param {YTWebhookManager} youtube
     * @param {Database} database
     * @param {MStats} mStats
     * @param {Catcher} catcher
     * @param {Logger} logger
     * @memberof Bot
     */
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

var mStats = new MStats(DBURI, 'admin');
var database = new Database(DBURI, 'admin');
var logger = new Logger(DBURI, 'admin');
var client = new discord.Client();
var commands = new Commands(__dirname + '/commands/');
var filters = new Filters(__dirname + '/filters/');
var youtube = new YTWebhookManager(DBURI, 'admin');
var catcher = new Catcher(callbackPort);
Bot.init(client, commands, filters, youtube, database, mStats, catcher, logger);

exitHook(() => {
    console.log('Saving cached data...');
    Bot.mStats.saveHour(Bot.mStats.hourly);
    var until = new Date().getTime() + durations.second;
    while (until > new Date().getTime()) { }
    console.log("cached data saved");
});

client.on('ready', () => {
    Bot.client.user.setActivity("I'm ready!")
});

client.on('error', (error: any) => {
    Bot.mStats.logError(error);
    console.error('from client.on():', error);
    if (error.target)
        console.log(error.target);
    if (error.target.WebSocket)
        console.log(error.target.WebSocket);
    if (error.target._events)
        console.log(error.target.WebSocket._events);
});

client.on('message', async message => {
    if (message.author.bot) return;
    var requestTime = process.hrtime(); //  gets timestamp to calculate the response time 
    Bot.mStats.logMessageReceived();
    var dm = false; // checks if it's from a dm
    if (!message.guild) {
        dm = true;
    }

    // if message is only a mention of the bot, he dms help
    if (message.content == '<@' + Bot.client.user.id + '>') {
        message.author.createDM().then(dmChannel => {
            message.channel = dmChannel;
            Bot.commands.runCommand(message, '', 'help', permLevels.member, true, requestTime);
            Bot.commands.runCommand(message, 'help', 'help', permLevels.member, true, requestTime);
        });
        return;
    }

    var permLevel = permLevels.member;
    if (!dm) {// gets perm level of member if message isn't from dms
        permLevel = await getPermLevel(message.member);
    }

    var prefix = await Bot.database.getPrefix(message.guild);
    if (!message.content.startsWith(prefix)) {
        if (!message.content.toLowerCase().startsWith(Bot.database.settingsDB.cache.prefix + 'prefix')) { // also checks if it contains ?!prefix
            if (!dm && permLevel == permLevels.member) {
                Bot.filters.filterMessage(message); // filters message if from guild and if a member send it
            }
            return;
        }
    }
    // if the command is ?!prefix isn't ?!
    if (prefix != Bot.database.settingsDB.cache.prefix && message.content.startsWith(Bot.database.settingsDB.cache.prefix)) {
        prefix = Bot.database.settingsDB.cache.prefix; // sets prefix if message starts with ?!prefix
    }

    var command = message.content.split(' ')[0].slice(prefix.length).toLowerCase(); // gets command name
    var args = message.content.slice(prefix.length + command.length + 1); // gets arguments

    Bot.commands.runCommand(message, args, command, permLevel, dm, requestTime); // runs command
});

client.on('reconnecting', () => {
    console.warn('Lost client connection. Reconnecting...');
})

client.on('resume', missed => {
    console.info(`Successfully reconnected client. Missed ${missed} events.`)
})

client.on('channelDelete', async (channel: discord.TextChannel) => {
    if (channel.type == 'text') { // looks if webhooks for the deleted channel exist if it's a text channel
        var youtubeWebhookDocs = await Bot.youtube.webhooks.find({ guild: channel.guild.id, channel: channel.id });
        for (const webhookDoc of youtubeWebhookDocs) {
            Bot.youtube.deleteWebhook(channel.guild.id, channel.id, webhookDoc.toObject().feed);
        }
    }
});

client.on('guildCreate', guild => {
    Bot.database.addGuild(guild.id); // creates guild in database when bot joins a new guild
});

client.on('guildDelete', guild => {
    Bot.database.removeGuild(guild.id); // removes all guild related things in database if the bot leaves a guild
});

client.on('guildMemberRemove', async member => {
    var permLevel = await getPermLevel(member); // removes guild member from ranks if he/She was assigned any
    if (permLevel == permLevels.admin) {
        Bot.database.removeFromRank(member.guild.id, 'admins', undefined, member.id);
        Bot.logger.logStaff(member.guild, member.guild.me, logTypes.remove, 'admins', undefined, member.user);
    }
    if (permLevel == permLevels.mod) {
        Bot.database.removeFromRank(member.guild.id, 'mods', undefined, member.id);
        Bot.logger.logStaff(member.guild, member.guild.me, logTypes.remove, 'mods', undefined, member.user);
    }
    if (permLevel == permLevels.immune) {
        Bot.database.removeFromRank(member.guild.id, 'immune', undefined, member.id);
        Bot.logger.logStaff(member.guild, member.guild.me, logTypes.remove, 'immune', undefined, member.user);
    }
});

client.on('roleDelete', async role => {
    var staffDoc = await Bot.database.findStaffDoc(role.guild.id); // removes role from ranks if it was assigned to any
    if (!staffDoc) return;
    if (staffDoc.admins.roles.includes(role.id)) {
        Bot.database.removeFromRank(role.guild.id, 'admins', role.id);
        Bot.logger.logStaff(role.guild, role.guild.me, logTypes.remove, 'admins', role);
    }
    if (staffDoc.mods.roles.includes(role.id)) {
        Bot.database.removeFromRank(role.guild.id, 'mods', role.id);
        Bot.logger.logStaff(role.guild, role.guild.me, logTypes.remove, 'mods', role);
    }
    if (staffDoc.immune.roles.includes(role.id)) {
        Bot.database.removeFromRank(role.guild.id, 'immune', role.id);
        Bot.logger.logStaff(role.guild, role.guild.me, logTypes.remove, 'immune', role);
    }
});

client.on('debug', info => {
    //console.debug(info);
});

client.on('warn', info => {
    console.warn(info);
})

setTimeout(() => {
    client.login(botToken); // logs into discord after 2 seconds
}, 2000);
