import { Message, Guild, MessageAttachment, DiscordAPIError, DMChannel, TextChannel, GuildMember, CategoryChannel } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels, getPermLevel } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToChannel, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { guildSchema, CommandCache } from '../../database/schemas';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
import { content } from 'googleapis/build/src/apis/content';
import { Database } from '../../database/database';
import { truncateSync } from 'fs';

enum modmailModes {
    serversListed = 0,
    serverChosen = 1,
    serverConfirmed = 2,
    modReplyMode
}

var command: commandInterface = {
    name: 'modmail',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: true,
    shortHelp: 'DM BulletBot this command to chat to the moderators or use it to configure modmail.',
    embedHelp: async function (guild: Guild) {
        let prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.embedColors.help,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': 'Sending the command `modmail` to BulletBot will open a chat session with the moderators. Configuration is also possible (e.g. setting up the moderation channel)'
                    },
                    {
                        'name': 'Need to be:',
                        'value': permToString(command.permLevel),
                        'inline': true
                    },
                    {
                        'name': 'DM capable:',
                        'value': command.dm,
                        'inline': true
                    },
                    {
                        'name': 'Togglable:',
                        'value': command.togglable,
                        'inline': true
                    },
                    {
                        'name': 'Usage:', // all possible inputs to the guild, the arguments should be named
                        'value': '{command}\n{command} set [channel]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} // this will start a chat session\n{command} link \n{command} set #modmail'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number], commandCache?: CommandCache) => {
        try {
            // if the user wants to start a modmail session
            if (dm) {
                if (!commandCache) {
                    Bot.mStats.logCommandUsage(command.name);
                    let serverChoiceEmbed = {
                        "embed": {
                          "title": "Modmail chat session setup",
                          "description": "Please enter the server number you would like to contact.\nEnter `-1` to cancel this session.",
                          "color": Bot.database.settingsDB.cache.embedColors.help,
                          "timestamp": new Date().toISOString(),
                          "footer": {
                            "text": "This session will expire in 100s if nothing is sent"
                          },
                          "fields": [
                            
                          ]
                        }
                    };
                    let guildsarray: Guild[] = Bot.client.guilds.array();
                    let serverList: Guild[] = [];
                    let serverCounter = 0;

                    for (let i = 0; i < guildsarray.length; i++) {
                        if (await guildsarray[i].fetchMember(message.author)) {
                            if (guildsarray[i].channels.keyArray().includes((await Bot.database.mainDB.guilds.findOne({"guild": guildsarray[i].id}).exec()).modmailChannel))
                                    serverList.push(guildsarray[i]);
                        }
                    }

                    if (serverList.length == 0) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await message.channel.send("You do not share any servers with BulletBot or servers which have modmail and hence this command cannot be used.");
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    if (serverList.length == 1) {
                        let commandCache = new CommandCache(undefined, message.channel, message.author, command.name, 100000, { mode: modmailModes.serverChosen });
                        commandCache.cache.server = serverList[0].id;
                        let guild = await Bot.database.mainDB.guilds.findOne({'guild': commandCache.cache.server}).exec();
                        commandCache.cache.channel = guild.modmailChannel;
                        commandCache.cache.mode = modmailModes.serverChosen;
                        await commandCache.save(100000);
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await message.channel.send(
                            {
                                "embed": {
                                  "title": "Modmail server selection confirmation",
                                  "description": "Reply `yes` to confirm the selection, anything else will cancel this session.",
                                  "color": Bot.database.settingsDB.cache.embedColors.help,
                                  "timestamp": new Date().toISOString(),
                                  "thumbnail": {
                                    "url": serverList[0].iconURL
                                  },
                                  "fields": [
                                      {
                                        "name": "Selected server:",
                                        "value": `**${serverList[0].name}** (${serverList[0].id})`,
                                      }
                                  ]
                                }
                              }
                        );
                        Bot.mStats.logMessageSend();
                        return true;
                    }
                    serverList.sort( (a,b) => {
                        return parseInt(a.id) - parseInt(b.id);
                    });

                    for (let server in serverList) {
                        serverChoiceEmbed.embed.fields.push({"name": `${serverCounter + 1}`, "value": `**${serverList[serverCounter].name}** (${serverList[serverCounter].id})`});
                        serverCounter += 1;
                    }
                    
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    await message.channel.send(serverChoiceEmbed);
                    Bot.mStats.logMessageSend();
                    let commandCache = new CommandCache(undefined, message.channel, message.author, command.name, 100000, { mode: modmailModes.serversListed });
                    return true;
                } else { // command has begun
                    if (commandCache.cache.mode == modmailModes.serversListed)
                    {
                        let guildsarray: Guild[] = Bot.client.guilds.array();
                        let serverList: Guild[] = [];

                        for (let i = 0; i < guildsarray.length; i++) {
                            if (await guildsarray[i].fetchMember(message.author)) {
                                if (guildsarray[i].channels.keyArray().includes((await Bot.database.mainDB.guilds.findOne({"guild": guildsarray[i].id}).exec()).modmailChannel))
                                        serverList.push(guildsarray[i]);
                            }
                        }

                        serverList.sort( (a,b) => {
                            return parseInt(a.id) - parseInt(b.id);
                        });

                        let serverIndex: number = parseInt(message.content);

                        if (!Number.isInteger(serverIndex)) {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send('Please input *only* the number for the server.');
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                        if (serverIndex == -1) {
                            await commandCache.remove();
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send(
                            {"embed": {"title": "Modmail session closed","description": "Session ended","color": Bot.database.settingsDB.cache.embedColors.negative,
                            "timestamp": new Date().toISOString()}});
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                        if (!serverList[serverIndex - 1]) {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send('Please enter one number from the servers above, not their ID.')
                            Bot.mStats.logMessageSend();
                            return false;
                        }

                        commandCache.cache.server = serverList[serverIndex - 1].id;
                        commandCache.cache.mode = modmailModes.serverChosen;
                        await commandCache.save(100000);

                        // confirm choice
                        Bot.mStats.logResponseTime(command.name, requestTime);

                        await message.channel.send(
                            {
                                "embed": {
                                  "title": "Modmail server selection confirmation",
                                  "description": "Reply `yes` to confirm the selection, anything else will cancel this session.",
                                  "color": Bot.database.settingsDB.cache.embedColors.help,
                                  "timestamp": new Date().toISOString(),
                                  "thumbnail": {
                                    "url": serverList[serverIndex-1].iconURL
                                  },
                                  "fields": [
                                      {
                                        "name": "Selected server:",
                                        "value": `**${serverList[serverIndex - 1].name}** (${serverList[serverIndex - 1].id})`,
                                      }
                                  ]
                                }
                              }
                        );

                        Bot.mStats.logMessageSend();

                    } else if (commandCache.cache.mode == modmailModes.serverChosen) {
                        if (message.content == 'yes') {
                            let guild = await Bot.database.mainDB.guilds.findOne({'guild': commandCache.cache.server}).exec();
                            if (guild.modmailConnected) {
                                let modmailGuild = Bot.client.guilds.get(guild.linkedGuild);
                                // If the active modmail channel category doesn't exist, create it
                                let category = modmailGuild.channels.find(channel => (channel as CategoryChannel).children != undefined && channel.name.toLowerCase() == 'modmail');
                                if (!category) {
                                    category = await modmailGuild.createChannel('modmail', {type: 'category'});
                                }
                                let newReportChannel = await modmailGuild.createChannel(message.author.tag.replace('#', '-'), {
                                    type: 'text',
                                    topic: message.author.id + `;${message.channel.id}`,
                                    parent: category
                                });
                                commandCache.cache.channel = newReportChannel.id;
                            } else {
                                commandCache.cache.channel = guild.modmailChannel;
                            }
                            commandCache.cache.mode = modmailModes.serverConfirmed;
                            if (guild.modmailConnected) {
                                await commandCache.save(36000000);
                            } else {
                                await commandCache.save(200000);
                            }
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send({
                                "embed": {
                                  "title": "Modmail server selection confirmation",
                                  "description": "You have opened a chat session with the " + Bot.client.guilds.get(commandCache.cache.server).name + " moderation team.\nThe next few messages you send will be relayed to all moderators.\n✅ will show when a message has been sent.\nSessions can be ended by typing `end session` or by the moderation team when they see fit.",
                                  "color": Bot.database.settingsDB.cache.embedColors.help,
                                  "timestamp": new Date().toISOString(),
                                }
                            });
                            Bot.mStats.logMessageSend()
                        } else {
                            let modmailChannel = Bot.client.channels.get(commandCache.cache.channel) as TextChannel;

                            if (modmailChannel.topic != undefined) if (modmailChannel.topic.split(';')[0] == message.author.id) {await modmailChannel.delete();}
                            
                            await commandCache.remove();
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            
                            await message.channel.send(
                            {"embed": {"title": "Modmail session closed","description": "Session ended","color": Bot.database.settingsDB.cache.embedColors.negative,
                            "timestamp": new Date().toISOString()}});
                            
                            Bot.mStats.logMessageSend();
                        }
                    } else {

                        if (message.content.trim() == 'end session') {

                            let modmailChannel = Bot.client.channels.get(commandCache.cache.channel) as TextChannel;
                            await commandCache.remove();

                            Bot.mStats.logResponseTime(command.name, requestTime);

                            await message.channel.send(
                            {"embed": {"title": "Modmail session closed","description": "Session ended","color": Bot.database.settingsDB.cache.embedColors.negative,
                            "timestamp": new Date().toISOString()}});

                            Bot.mStats.logMessageSend();
                            if (modmailChannel.topic != undefined)
                                if (modmailChannel.topic.split(';').length == 2)
                                if (modmailChannel.topic.split(';')[1] == message.channel.id && modmailChannel.topic.split(';')[0] == message.author.id){
                                    
                                    await modmailChannel.send(
                                    {"embed": {"title": "Modmail session closed","description": "Session ended","color": Bot.database.settingsDB.cache.embedColors.negative,
                                    "timestamp": new Date().toISOString()}});
                                    
                                    Bot.mStats.logMessageSend();
                                }
                            return true;
                        }
                        await (Bot.client.channels.get(commandCache.cache.channel) as TextChannel).send(
                            {
                                "embed": {
                                  "color": Bot.database.settingsDB.cache.embedColors.default,
                                  "timestamp": new Date().toISOString(),
                                  "author": {
                                    "name": message.author.tag + ` (${message.author.id})`,
                                    "icon_url": message.author.avatarURL
                                  },
                                  "fields": [
                                    {
                                      "name": "User message:",
                                      "value": message.content
                                    }
                                  ]
                                }
                            }
                        );
                        await commandCache.save(360000000);
                        // I know this is in the wrong place but otherwise it doesn't execute a command
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        Bot.mStats.logMessageSend();
                        await message.react('✅');
                        return true;
                    }
                }
            } else {
                if (args.length == 0) {
                    await message.channel.send(await command.embedHelp(message.guild));
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                let argslist = args.split(' ');
                if (argslist[0] == 'r') {
                    let channelTopic = (message.channel as TextChannel).topic.split(';');
                    if (channelTopic.length != 2) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send("This is not a current moderation session.");
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    let commandCache = await Bot.database.mainDB.commandCache.findOne({"channel": channelTopic[1]}).exec();
                    if (commandCache.user == channelTopic[0] && commandCache.cache.channel == message.channel.id) {
                        let channel = Bot.client.channels.get(channelTopic[1]) as DMChannel;
                        let server = Bot.client.guilds.get(commandCache.cache.server);
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await channel.send({
                            "embed": {
                              "color": Bot.database.settingsDB.cache.embedColors.help,
                              "timestamp": new Date().toISOString(),
                              "author": {
                                "name": `${server.name} Moderation Team`,
                                "icon_url": server.iconURL
                              },
                              "fields": [
                                {
                                  "name": "Moderation team response:",
                                  "value": message.content
                                }
                              ]
                            }
                        });
                        Bot.mStats.logMessageSend();
                        return true;
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send("This is not a current moderation session.");
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                }
                if (argslist[0] == 'endsession') {
                    let channelTopic = (message.channel as TextChannel).topic.split(';');
                    if (channelTopic.length != 2) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send("This is not a current moderation session.");
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    let commandCache = await Bot.database.mainDB.commandCache.findOne({"channel": channelTopic[1]}).exec();
                    if (commandCache.user == channelTopic[0] && commandCache.cache.channel == message.channel.id) {
                        let channel = Bot.client.channels.get(channelTopic[1]) as DMChannel;
                        await commandCache.remove();
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await channel.send(
                        {"embed": {"title": "Modmail session closed","description": "Session ended","color": Bot.database.settingsDB.cache.embedColors.negative,
                        "timestamp": new Date().toISOString()}});
                        Bot.mStats.logMessageSend();
                        await message.channel.send(
                        {"embed": {"title": "Modmail session closed","description": "Session ended","color": Bot.database.settingsDB.cache.embedColors.negative,
                        "timestamp": new Date().toISOString()}});
                        Bot.mStats.logMessageSend();
                        return true;
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send("This is not a current moderation session.");
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                }
                if ((await getPermLevel(message.member)) >= permLevels.admin) {
                    if (argslist[0] == 'set' && argslist.length == 2 && (await getPermLevel(message.member)) >= permLevels.admin) {
                        let modmailChannel = await stringToChannel(message.guild, argslist[1], true, true);
                        if (modmailChannel) {
                            await Bot.database.mainDB.guilds.updateOne({'guild': message.guild.id},
                            { $set: {modmailChannel: modmailChannel.id} });
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send(`Set modmail channel to ${modmailChannel}.`);
                            Bot.mStats.logMessageSend();
                            return true;
                        } else {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send('I couldn\'t find the specified channel.');
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                    } else if (argslist[0] == 'setserver'
                                && argslist.length == 3
                                && (await getPermLevel(message.member)) >= permLevels.admin) {
                        let modmailGuildDoc = await Bot.database.mainDB.guilds.findOne({"guild": argslist[1]}).exec();
                        if (modmailGuildDoc) {
                            let currentGuildDoc = await Bot.database.mainDB.guilds.findOne({"guild": message.guild.id}).exec();
                            if (!currentGuildDoc.modmailConnected) {
                                if (!modmailGuildDoc.modmailConnected) {
                                    if (modmailGuildDoc.modmailSecret == argslist[2]) {
                                        // commence the transaction
                                        modmailGuildDoc.modmailSecret = makeSecret(8);
                                        modmailGuildDoc.modmailConnected = true;
                                        modmailGuildDoc.isModmailGuild = true;
                                        modmailGuildDoc.linkedGuild = message.guild.id;

                                        currentGuildDoc.isModmailGuild = false;
                                        currentGuildDoc.modmailConnected = true;
                                        currentGuildDoc.linkedGuild = modmailGuildDoc.guild;

                                        await modmailGuildDoc.save();
                                        await currentGuildDoc.save();

                                        Bot.mStats.logResponseTime(command.name, requestTime);
                                        message.channel.send("Set modmail server.");
                                        Bot.mStats.logMessageSend();
                                    } else {
                                        Bot.mStats.logResponseTime(command.name, requestTime);
                                        message.channel.send("Incorrect secret provided.");
                                        Bot.mStats.logMessageSend();
                                        return false;
                                    }
                                } else {
                                    Bot.mStats.logResponseTime(command.name, requestTime);
                                    message.channel.send("The server you are attempting to connect to is already linked. Please unlink the server first.");
                                    Bot.mStats.logMessageSend();
                                    return false;
                                }
                            } else {
                                Bot.mStats.logResponseTime(command.name, requestTime);
                                message.channel.send("The server is already connected to modmail. Please unlink the server first.");
                                Bot.mStats.logMessageSend();
                                return false;
                            }
                        } else {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send("Couldn't find the requested server. Maybe BulletBot isn't in it?");
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                    } else if (argslist[0] == 'getserver') {
                        let currentGuild = await Bot.database.mainDB.guilds.findOne({"guild": message.guild.id}).exec();
                        if (currentGuild.linkedGuild) {
                            let guild = Bot.client.guilds.get(currentGuild.linkedGuild);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`Linked server is: **${guild.name}** (${guild.id})`);
                            Bot.mStats.logMessageSend();
                            return true;
                        } else {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send('This server is not linked to another.');
                            Bot.mStats.logMessageSend();
                            return true;
                        }
                    } else if (argslist[0] == 'getsecret') {
                        let currentGuildDoc = await Bot.database.mainDB.guilds.findOne({"guild": message.guild.id}).exec();
                        if (currentGuildDoc.modmailSecret == '' || currentGuildDoc.modmailSecret == undefined) {
                            currentGuildDoc.modmailSecret = makeSecret(8);
                            await currentGuildDoc.save();
                        }
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.author.send(`The secret is \`\`\`${currentGuildDoc.modmailSecret}\`\`\``);
                        Bot.mStats.logMessageSend();
                        return true;
                    } else if (argslist[0] == 'decouple') {
                        let currentGuildDoc = await Bot.database.mainDB.guilds.findOne({"guild": message.guild.id}).exec();
                        let connectedGuild = await Bot.database.mainDB.guilds.findOne({"guild": currentGuildDoc.linkedGuild}).exec();
                        if (connectedGuild.modmailSecret == argslist[1])
                        {
                            // commence dettachment
                            connectedGuild.modmailSecret = makeSecret(8);
                            connectedGuild.isModmailGuild = false;
                            connectedGuild.modmailConnected = false;
                            connectedGuild.linkedGuild = '';

                            currentGuildDoc.modmailSecret = makeSecret(8);
                            currentGuildDoc.isModmailGuild = false;
                            currentGuildDoc.modmailConnected = false;
                            currentGuildDoc.linkedGuild = '';

                            await currentGuildDoc.save();
                            await connectedGuild.save();

                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send("Decoupled the servers.");
                            Bot.mStats.logMessageSend();
                            return true;
                        } else {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send("Incorrect secret provided.");
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                    }
                } else {
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send("You may need to be an administrator to run this command.");
                    Bot.mStats.logMessageSend();
                    return false;
                }
            }
            return false; // was unsuccessful
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false; // was unsuccessful
        }
    }
};

function makeSecret(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=........';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

export default command;
