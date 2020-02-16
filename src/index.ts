import * as discord from 'discord.js';
import exitHook = require('exit-hook');
import fs = require('fs');

import { botToken, callback, cluster, crashProof } from './bot-config.json';
import { Catcher } from './catcher';
import { Commands } from './commands';
import { CaseLogger } from './database/caseLogger';
import { Database } from './database/database';
import { GuildWrapper } from './database/guildWrapper';
import { Logger } from './database/logger';
import { MStats } from './database/mStats';
import { PActions } from './database/pActions';
import { LogTypes, megalogGroups } from './database/schemas';
import { Settings } from './database/settings';
import { updateDatabaseAfter1_2_8 } from './database/update';
import { Filters } from './filters';
import {
    cacheAttachment,
    logBan,
    logChannelToggle,
    logChannelUpdate,
    logGuildName,
    logMember,
    logMemberRoles,
    logMessageBulkDelete,
    logMessageDelete,
    logMessageEdit,
    logNickname,
    logReactionRemoveAll,
    logReactionToggle,
    logRoleToggle,
    logRoleUpdate,
    logVoiceDeaf,
    logVoiceMute,
    logVoiceTransfer,
} from './megalogger';
import { PermLevels } from './utils/permissions';
import { Durations } from './utils/time';
import { YTWebhookManager } from './youtube';

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

        var output = `[${stack[1].getFileName().split(/[\\\/]/).pop()}:${stack[1].getFunctionName()}:${stack[1].getLineNumber()}]   `;
        for (; output.length < 25; output += ' ') { }
        return output;
    },
    pattern: 'dd/mm/yyyy HH:MM:ss.l'
});

// catches uncaught exceptions
process.on('uncaughtException', (error) => {
    if (Bot.mStats)
        Bot.mStats.logError(error);
    //console.error(error);
});

// catches unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    var error = new Error('Unhandled Rejection. Reason: ' + reason);
    if (Bot.mStats)
        Bot.mStats.logError(error);
    console.error(error, "Promise:", promise);
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
    static pActions: PActions;
    static caseLogger: CaseLogger;
    static settings: Settings;

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
     * @param {CaseLogger} caseLogger
     * @memberof Bot
     */
    static init(client: discord.Client, commands: Commands, filters: Filters, youtube: YTWebhookManager,
        database: Database, mStats: MStats, catcher: Catcher, logger: Logger, pActions: PActions,
        caseLogger: CaseLogger, settings: Settings) {
        this.client = client;
        this.commands = commands;
        this.filters = filters;
        this.youtube = youtube;
        this.database = database;
        this.mStats = mStats;
        this.catcher = catcher;
        this.logger = logger;
        this.pActions = pActions;
        this.caseLogger = caseLogger;
        this.settings = settings;
    }
}

// init all modules
var mStats = new MStats(cluster);
var database = new Database(cluster);
var logger = new Logger(cluster);
var client = new discord.Client({ disableEveryone: true });
var commands = new Commands(__dirname + '/commands/');
var filters = new Filters(__dirname + '/filters/');
var youtube = new YTWebhookManager(cluster);
var catcher = new Catcher(callback.port);
let pActions = new PActions(cluster);
var caseLogger = new CaseLogger(cluster);
let settings = new Settings(cluster);
Bot.init(client, commands, filters, youtube, database, mStats, catcher, logger, pActions, caseLogger, settings);

// when bot shuts down save the mStats cache
exitHook(() => {
    if (!Bot.mStats.hourly) return;
    console.log('Saving cached data...');
    Bot.mStats.saveHour(Bot.mStats.hourly);
    var until = new Date().getTime() + Durations.second;
    while (until > new Date().getTime()) { }
    console.log("cached data saved");
});

// write the current timestamp to a file. This can be used to determine if the bot has crashed or is disconnected.
setInterval(() => {
    if (client.status === 0) {
        fs.writeFileSync(crashProof.file, Date.now());
    }
}, crashProof.interval);

/* for events below check the discord.js docs */

client.on('ready', async () => {
    // updates the database with guilds he left and joined while offline.
    let existingGuilds = await Bot.database.mainDB.guilds.distinct('guild').exec();
    let guildsToRemove = existingGuilds.filter(x => !client.guilds.get(x));
    let guildsToAdd = client.guilds.filter(x => !existingGuilds.includes(x.id));
    console.info(`Adding ${guildsToAdd.size} guilds and removing ${guildsToRemove.length} guilds`);
    for (const guildID of guildsToRemove) { // removes all guilds that the bot left while it was down
        Bot.database.removeGuild(guildID)
    }
    for (const guild of guildsToAdd.array()) { // adds all guilds that the bot joined while it was down
        Bot.database.addGuild(guild.id);
    }

    Bot.client.user.setActivity('I\'m ready!');
    console.log('I\'m ready!');
});

client.on('error', async (error: any) => {
    Bot.mStats.logError(error);
    console.error('from client.on():', error);
    // this is just some temporary code to debug a certain problem we can't recreate. Probably will be removed soon as that error never occurred again
    if (error.target) {
        console.log('error.target', error.target);
        if (error.target._events) {
            console.log('error.target._events', error.target._events);
        }
        if (error.target.WebSocket) {
            console.log('error.target.WebSocket', error.target.WebSocket);
            if (error.target.WebSocket._events) {
                console.log('error.target.WebSocket._events', error.target.WebSocket._events);
            }
        }
    }
});

client.on('message', async message => {
    if (message.author.id != client.user.id) cacheAttachment(message); // megalog attachment caches the message
    if (message.author.bot) return;
    var requestTime = process.hrtime(); //  gets timestamp to calculate the response time 
    Bot.mStats.logMessageReceived();
    var dm = false; // checks if it's from a dm
    if (!message.guild)
        dm = true;

    // get command cache if there is one
    let commandCache = await Bot.database.getCommandCache(message.channel, message.author);

    // get guild wrapper
    let guildWrapper: GuildWrapper = undefined;
    if (!dm)
        guildWrapper = await Bot.database.getGuildWrapper(message.guild);

    // if message is only a mention of the bot, he dms help
    if (message.content == '<@' + Bot.client.user.id + '>' && !commandCache) {
        message.channel = await message.author.createDM();
        Bot.commands.runCommand(message, '', 'help', PermLevels.member, true, guildWrapper, requestTime);
        Bot.commands.runCommand(message, 'help', 'help', PermLevels.member, true, guildWrapper, requestTime);
        return;
    }

    // get perm level
    let permLevel = PermLevels.member;
    if (!dm) permLevel = await guildWrapper.getPermLevel(message.member);

    // directly calls command when command cache exists
    if (commandCache) {
        Bot.commands.runCachedCommand(message, commandCache, permLevel, dm, guildWrapper, requestTime);
        return;
    }

    let prefix = await guildWrapper.getPrefix();
    if (!message.content.startsWith(prefix)) {
        if (!message.content.toLowerCase().startsWith(Bot.settings.prefix + 'prefix')) { // also checks if it contains ?!prefix
            if (!dm && permLevel == PermLevels.member) {
                Bot.filters.filterMessage(message); // filters message if from guild and if a member send it
            }
            return;
        }
        prefix = Bot.settings.prefix;
    }

    let command = message.content.split(' ')[0].slice(prefix.length).toLowerCase(); // gets command name
    let args = message.content.slice(prefix.length + command.length + 1); // gets arguments

    Bot.commands.runCommand(message, args, command, permLevel, dm, guildWrapper, requestTime); // runs command
});

client.on('messageUpdate', async (oldMessage: discord.Message, newMessage: discord.Message) => {
    logMessageEdit(oldMessage, newMessage);
});

client.on('messageDelete', async message => {
    logMessageDelete(message);
});

client.on('messageDeleteBulk', async messages => {
    logMessageBulkDelete(messages);
});

client.on('messageReactionAdd', async (messageReaction: discord.MessageReaction, user: discord.User) => {
    logReactionToggle(messageReaction, user, true);
});

client.on('messageReactionRemove', async (messageReaction: discord.MessageReaction, user: discord.User) => {
    logReactionToggle(messageReaction, user, false);
});

client.on('messageReactionRemoveAll', async message => {
    logReactionRemoveAll(message);
});

client.on('reconnecting', async () => {
    console.warn('Lost client connection. Reconnecting...');
});

client.on('resume', async missed => {
    console.info(`Successfully reconnected client. Missed ${missed} events.`)
});

client.on('channelCreate', async channel => {
    if (channel instanceof discord.GuildChannel)
        logChannelToggle(channel, true);
});

client.on('channelDelete', async channel => {
    if (channel instanceof discord.GuildChannel)
        logChannelToggle(channel, false);
    if (channel instanceof discord.TextChannel) { // if guild channel was deleted clean all data form the database regarding it
        var youtubeWebhookDocs = await Bot.youtube.webhooks.find({ guild: channel.guild.id, channel: channel.id }); // looks if webhooks for the deleted channel exist if it's a text channel
        for (const webhookDoc of youtubeWebhookDocs) {
            Bot.youtube.deleteWebhook(channel.guild.id, channel.id, webhookDoc.toObject().feed);
        }
        let guildWrapper = await Bot.database.getGuildWrapper(channel.guild, 'megalog');
        for (const func of megalogGroups.all)
            if (guildWrapper.megalog[func] == channel.id)
                await guildWrapper.disableMegalogFunction(func);
    }
});

client.on('channelUpdate', async (oldChannel: discord.Channel, newChannel: discord.Channel) => {
    if (oldChannel instanceof discord.GuildChannel && newChannel instanceof discord.GuildChannel)
        logChannelUpdate(oldChannel, newChannel);
})

client.on('guildCreate', async guild => {
    Bot.database.addGuild(guild.id); // creates guild in database when bot joins a new guild
});

client.on('guildDelete', async guild => {
    Bot.database.removeGuild(guild.id); // removes all guild related things in database if the bot leaves a guild
});

client.on('guildUpdate', async (oldGuild: discord.Guild, newGuild: discord.Guild) => {
    logGuildName(oldGuild, newGuild);
});

client.on('guildBanAdd', async (guild: discord.Guild, user: discord.User) => {
    if (user.id != client.user.id)
        logBan(guild, user, true);
});

client.on('guildBanRemove', async (guild: discord.Guild, user: discord.User) => {
    logBan(guild, user, false);
});

client.on('guildMemberAdd', async member => {
    logMember(member, true);
});

client.on('guildMemberRemove', async member => {
    if (member.user.id != client.user.id)
        logMember(member, false);

    let guildWrapper = await Bot.database.getGuildWrapper(member.guild);
    for (const rank of ['admins', 'mods', 'immune'])
        // @ts-ignore
        if (await guildWrapper.removeFromRank(rank, undefined, member, false))
            // @ts-ignore
            Bot.logger.logStaff(member.guild, member.guild.me, LogTypes.remove, rank, undefined, member.user);

    let userDoc = await Bot.database.findUserDoc(member.id);
    if (userDoc && userDoc.commandLastUsed && userDoc.commandLastUsed[member.guild.id]) {
        delete userDoc.commandLastUsed[member.guild.id];
        userDoc.markModified('commandLastUsed.' + member.guild.id);
        userDoc.save();
    }
});

client.on('guildMemberUpdate', async (oldMember: discord.GuildMember, newMember: discord.GuildMember) => {
    logNickname(oldMember, newMember);
    logMemberRoles(oldMember, newMember);
});

client.on('voiceStateUpdate', async (oldMember: discord.GuildMember, newMember: discord.GuildMember) => {
    logVoiceTransfer(oldMember, newMember);
    if (oldMember.voiceChannelID) {
        logVoiceMute(oldMember, newMember);
        logVoiceDeaf(oldMember, newMember);
    }
});

client.on('roleCreate', async role => {
    logRoleToggle(role, true);
});

client.on('roleDelete', async role => {
    logRoleToggle(role, false);

    let guildWrapper = await Bot.database.getGuildWrapper(role.guild);
    for (const rank of ['admins', 'mods', 'immune'])
        // @ts-ignore
        if (await guildWrapper.removeFromRank(rank, role, undefined, false))
            // @ts-ignore
            Bot.logger.logStaff(role.guild, role.guild.me, LogTypes.remove, rank, role);
});

client.on('roleUpdate', async (oldRole: discord.Role, newRole: discord.Role) => {
    logRoleUpdate(oldRole, newRole);
});

client.on('debug', async info => {
    //console.debug(info);
});

client.on('warn', async info => {
    console.warn(info);
});


updateDatabaseAfter1_2_8().then(() => {
    let loginInterval = setInterval(() => {
        if (!Bot.database.mainDB) return; // if not connected to cluster
        Bot.client.login(botToken); // logs into discord after 2 seconds
        clearInterval(loginInterval);
    }, 2000);
});