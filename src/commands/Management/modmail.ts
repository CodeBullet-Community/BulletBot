// TODO: add quick response for the mods (?!modmail qr 2)
import { Message, Guild, MessageAttachment, DiscordAPIError, DMChannel, TextChannel } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToChannel, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { guildSchema, CommandCache } from '../../database/schemas';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
import { content } from 'googleapis/build/src/apis/content';

enum modmailModes {
    serversListed = 0,
    serverChosen = 1,
    serverConfirmed = 2
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
                        'value': '{command}// this will start a chat session\n{command} set #modmail'.replace(/\{command\}/g, prefix + command.name)
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
                          "thumbnail": {
                            "url": Bot.client.user.avatarURL
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
                            serverList.push(guildsarray[i]);
                        }
                    }

                    if (serverList.length == 0) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await message.channel.send("You do not share any servers with BulletBot and hence this command cannot be used.");
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    serverList.sort( (a,b) => {
                        return parseInt(a.id) - parseInt(b.id);
                    });

                    for (let server in serverList) {
                        serverChoiceEmbed.embed.fields.push({"name": `${serverCounter + 1}`, value: `**${serverList[serverCounter].name}** (${serverList[serverCounter].id})`});
                        serverCounter += 1;
                    }
                    
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    await message.channel.send(serverChoiceEmbed);
                    let commandCache = new CommandCache(undefined, message.channel, message.author, command.name, 100000, { mode: modmailModes.serversListed });
                } else { // command has begun
                    if (commandCache.cache.mode == modmailModes.serversListed)
                    {
                        let guildsarray: Guild[] = Bot.client.guilds.array();
                        let serverList: Guild[] = [];

                        for (let i = 0; i < guildsarray.length; i++) {
                            if (await guildsarray[i].fetchMember(message.author)) {
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
                            commandCache.remove();
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send({
                                "embed": {
                                  "title": "Modmail session closed",
                                  "description": "Session cancelled",
                                  "color": Bot.database.settingsDB.cache.embedColors.negative,
                                  "timestamp": new Date().toISOString(),
                                  "thumbnail": {
                                    "url": Bot.client.user.avatarURL,
                                  },
                                }
                            });
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
                        let guild = await Bot.database.mainDB.guilds.findOne({'guild': commandCache.cache.server}).exec();
                        commandCache.cache.channel = guild.modmailChannel;
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
                            commandCache.cache.mode = modmailModes.serverConfirmed;
                            await commandCache.save(200000);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send({
                                "embed": {
                                  "title": "Modmail server selection confirmation",
                                  "author": {
                                      "name": "BulletBot",
                                      "icon_url": Bot.client.user.avatarURL
                                  },
                                  "description": "You have opened a chat session with the " + Bot.client.guilds.get(commandCache.cache.server).name + " moderation team.\nThe next few messages you send will be relayed to all moderators.\n✅ will show when a message has been sent.\nSessions can be ended by typing `end session` or 50s after the last message was sent.",
                                  "color": Bot.database.settingsDB.cache.embedColors.help,
                                  "timestamp": new Date().toISOString(),
                                  "thumbnail": {
                                    "url": Bot.client.guilds.get(commandCache.cache.server).iconURL,
                                  },
                                }
                            });
                            Bot.mStats.logMessageSend()
                        } else {
                            await commandCache.remove();
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send({
                                "embed": {
                                  "title": "Modmail session closed",
                                  "description": "Session cancelled",
                                  "color": Bot.database.settingsDB.cache.embedColors.negative,
                                  "timestamp": new Date().toISOString(),
                                  "thumbnail": {
                                    "url": Bot.client.user.avatarURL,
                                  },
                                }
                            });
                            Bot.mStats.logMessageSend();
                        }
                    } else {

                        if (message.content.trim() == 'end session')
                        {
                            commandCache.remove();
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            await message.channel.send({
                                "embed": {
                                  "title": "Modmail session closed",
                                  "description": "Session ended",
                                  "color": Bot.database.settingsDB.cache.embedColors.negative,
                                  "timestamp": new Date().toISOString(),
                                  "thumbnail": {
                                    "url": Bot.client.user.avatarURL,
                                  },
                                }
                            });
                            Bot.mStats.logMessageSend();
                            return true;
                        }

                        await (Bot.client.channels.get(commandCache.cache.channel) as TextChannel).send(
                            {
                                "embed": {
                                  "color": Bot.database.settingsDB.cache.embedColors.default,
                                  "timestamp": new Date().toISOString(),
                                  "author": {
                                    "name": message.author.tag,
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
                        await commandCache.save(50000);
                        // I know this is in the wrong place but otherwise it doesn't execute a command
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await message.react('✅');
                    }
                }
            } else {
                if (args.length == 0) {
                    await message.channel.send(await command.embedHelp(message.guild));
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                let argslist = args.split(' ');
                if (argslist[0] == 'set') {
                    let modmailChannel = await stringToChannel(message.guild, argslist[1], true, true);
                    if (modmailChannel) {
                        await Bot.database.mainDB.guilds.updateOne({'guild': message.guild.id},
                        { $set: {modmailChannel: modmailChannel.id} });
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        await message.react('✅');
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send('I couldn\'t find the specified channel.');
                        Bot.mStats.logMessageSend();
                    }
                // TODO: this should be saved for a future update possibly as there is an issue with spam
                // } else if (/*author is > mod*/{
                //     if (member is in server)
                //     let member = await stringToMember(message.guild, argslist[0], false, false, false);
                //     if (!member) {
                //         await message.channel.send(`Couldn't find specified member.`);
                //         Bot.mStats.logMessageSend();
                //         return false;
                //     }
                //     await member.send({
                //         "embed": {
                //             "title": "Moderator response relay",
                //             "author": {
                //                 "name": "BulletBot",
                //                 "icon_url": Bot.client.user.avatarURL
                //             },
                //             "description": "Relayed moderator reply",
                //             "color": Bot.database.settingsDB.cache.embedColors.help,
                //             "timestamp": new Date(),
                //             "thumbnail": {
                //               "url": message.guild.iconURL,
                //             },
                //             "fields": [
                //                 {
                //                     "name": "Moderator message:",
                //                     "value": argslist.slice(1).join(' ')
                //                 }
                //             ]
                //         }
                //     });
                //     await message.react('✅');
                //     return true;
                }
            }
            return true; // was successful
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false; // was unsuccessful
        }
    }
};
