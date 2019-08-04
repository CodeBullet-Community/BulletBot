import * as discord from 'discord.js';
import exitHook = require('exit-hook');
import { Commands } from './commands';
import { Filters } from './filters';
import { YTWebhookManager } from './youtube';
import { Catcher } from './catcher';
import { Logger } from './database/logger';
import { Database } from './database/database';
import { MStats } from './database/mStats';
import { botToken, cluster, callback, crashProof } from './bot-config.json';
import { permLevels, getPermLevel } from './utils/permissions';
import { logTypes } from './database/schemas';
import { durations } from './utils/time';
import fs = require('fs');
import { logChannelToggle, logChannelUpdate, logBan, logMember, logNickname, logMemberRoles, logGuildName, cacheAttachment, logMessageDelete, logMessageBulkDelete, logMessageEdit, logReactionToggle, logReactionRemoveAll, logRoleToggle, logRoleUpdate, logVoiceTransfer, logVoiceMute, logVoiceDeaf } from './megalogger';
import { PActions } from './database/pActions';
import { CaseLogger } from "./database/caseLogger";

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

process.on('uncaughtException', (error) => {
    if (Bot.mStats)
        Bot.mStats.logError(error);
    console.error(error);
});

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
        database: Database, mStats: MStats, catcher: Catcher, logger: Logger, pActions: PActions, caseLogger: CaseLogger) {
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
    }
}

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
Bot.init(client, commands, filters, youtube, database, mStats, catcher, logger, pActions, caseLogger);

exitHook(() => {
    console.log('Saving cached data...');
    Bot.mStats.saveHour(Bot.mStats.hourly);
    var until = new Date().getTime() + durations.second;
    while (until > new Date().getTime()) { }
    console.log("cached data saved");
});

setInterval(() => {
    if (client.status === 0) {
        fs.writeFileSync(crashProof.file, Date.now());
    }
}, crashProof.interval);

client.on('ready', async () => {
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
    if (message.author.id != client.user.id) cacheAttachment(message);
    if (message.author.bot) return;
    var requestTime = process.hrtime(); //  gets timestamp to calculate the response time 
    Bot.mStats.logMessageReceived();
    var dm = false; // checks if it's from a dm
    if (!message.guild) {
        dm = true;
    }

    let commandCache = await Bot.database.getCommandCache(message.channel, message.author);

    // if message is only a mention of the bot, he dms help
    if (message.content == '<@' + Bot.client.user.id + '>' && !commandCache) {
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

    if (commandCache) {
        Bot.commands.runCachedCommand(message, commandCache, permLevel, dm, requestTime);
        return;
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
    if (channel instanceof discord.TextChannel) {
        var youtubeWebhookDocs = await Bot.youtube.webhooks.find({ guild: channel.guild.id, channel: channel.id }); // looks if webhooks for the deleted channel exist if it's a text channel
        for (const webhookDoc of youtubeWebhookDocs) {
            Bot.youtube.deleteWebhook(channel.guild.id, channel.id, webhookDoc.toObject().feed);
        }
        let megalogDoc = await Bot.database.findMegalogDoc(channel.guild.id); // checks if there are any megalogger functions for that channel
        if (megalogDoc) {
            let modified = false;
            if (megalogDoc.ignoreChannels.includes(channel.id)) {
                megalogDoc.ignoreChannels.splice(megalogDoc.ignoreChannels.indexOf(channel.id), 1);
                modified = true;
            }
            let megalogObject = megalogDoc.toObject();
            for (const key in megalogObject) {
                if (megalogObject[key] == channel.id) {
                    megalogDoc[key] = undefined;
                    modified = true;
                }
            }
            if (modified) megalogDoc.save();
        }
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
    var userDoc = await Bot.database.findUserDoc(member.id);
    if (userDoc && userDoc.commandCooldown && userDoc.commandCooldown[member.guild.id]) {
        delete userDoc.commandCooldown[member.guild.id];
        userDoc.markModified('commandCooldown.' + member.guild.id);
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

client.on('roleUpdate', async (oldRole: discord.Role, newRole: discord.Role) => {
    logRoleUpdate(oldRole, newRole);
});

client.on('debug', async info => {
    //console.debug(info);
});

client.on('warn', async info => {
    console.warn(info);
});

setTimeout(() => {
    client.login(botToken); // logs into discord after 2 seconds

    // enforce presence every hour
    setInterval(() => {
        if (Bot.database.settingsDB.cache) {
            if (Bot.database.settingsDB.cache.presence && (Bot.database.settingsDB.cache.presence.status || Bot.database.settingsDB.cache.presence.game || Bot.database.settingsDB.cache.presence.afk)) {
                Bot.client.user.setPresence(Bot.database.settingsDB.cache.presence);
            } else {
                Bot.client.user.setActivity(undefined);
                Bot.client.user.setStatus('online');
            }
        }
    }, durations.hour);
}, 2000);