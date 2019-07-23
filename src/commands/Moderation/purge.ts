import { Message, Guild, TextChannel, MessageAttachment, User } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { Collection } from 'mongoose';
import { commandCacheSchema } from '../../database/schemas';

/**
 * An enum which describes the possible types of messages that can be filtered
 *
 * @enum {number}
 */
enum messageTypes {
    text = 1,
    file = 2,
    image = 3,
    url = 4,
    invite = 5,
    //botMessage = 6,
    mention = 7
}

enum substringLocation {
    beginning = 1,
    anywhere = 2,
    end = 3
}
/**
 * An interface which describes the different methods messages can be filtered.
 * @member {messageTypes} type what type of message is allowed
 * @member {substringLocation} location where we will search for a certain piece of text
 * @member {string?} value what we would like to check for
 * @interface purgeCommandCriteria
 */
interface purgeCommandCriteria {
    type?: messageTypes,
    location?: substringLocation,
    value?: string,
    userID?: string
}

var command: commandInterface = {
    name: 'purge',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    shortHelp: 'Command deletes last x messages',
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
                        'value': 'Command deletes last x messages that match a certain criteria in the current channel for moderation purposes'
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
                        'name': 'Usage:',
                        'value': '{command} [n messages]\n{command} [user] [n messages]\n{command} mentions [user] [n messages]\n{command} endswith [content] [n messages]\n{command} startswith [content] [n messages]\n{command} contains [content] [n messages]\n{command} has [img | text | file | link | invite] [n messages]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} 3'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) {
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false; // was unsuccessful
            }
            let argsArray = args.split(' ').filter(x => x.length != 0);
            let maxMessages = 1000;
            if (Bot.database.settingsDB.cache.commands[command.name] && Bot.database.settingsDB.cache.commands[command.name].maxMessages) {
                maxMessages = Bot.database.settingsDB.cache.commands[command.name].maxMessages;
            } else {
                console.warn(`WARNINGS: PLEASE SET THE 'maxMessages' PROPERTY FOR THE PURGE COMMAND IN THE GLOBAL DOC`);
            }
            if (argsArray.length == 1) {
                if (!Number.isInteger(parseInt(argsArray[0]))) {
                    message.channel.send(`Malformed command.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                let numberOfMessages = parseInt(argsArray[0]);
                if (numberOfMessages > maxMessages) {
                    message.channel.send(`You can only delete a maximum of ${maxMessages} messages.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                await message.delete();
                //@ts-ignore
                let found = await DeleteLastXmessages(numberOfMessages, message.channel);
                Bot.mStats.logResponseTime(command.name, requestTime);
                if (!found) {
                    message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                    Bot.mStats.logMessageSend();
                }
                Bot.mStats.logCommandUsage(command.name);
                return true;
            }
            else if (argsArray.length == 2) { // [user] [num messages] 
                let user = await stringToMember(message.guild, argsArray[0], false, false, false);
                if (!user) {
                    message.channel.send(`Malformed command.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }
                let criteria: purgeCommandCriteria = {
                    userID: user.id
                }

                if (!Number.isInteger(parseInt(argsArray[1]))) {
                    message.channel.send(`Malformed command.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }

                let numberOfMessages = parseInt(argsArray[1]);
                if (numberOfMessages > maxMessages) {
                    message.channel.send(`You can only delete a maximum of ${maxMessages} messages.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }

                await message.delete();
                
                //@ts-ignore
                let found: boolean = await DeleteLastXmessages(numberOfMessages, message.channel, criteria);
                Bot.mStats.logResponseTime(command.name, requestTime);
                if (!found) {
                    message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                    Bot.mStats.logMessageSend();
                }
                Bot.mStats.logCommandUsage(command.name, `user`);
                return true;
            }
            else {
                let numMessages = parseInt(argsArray[argsArray.length - 1]);
                if (!Number.isInteger(numMessages)) {
                    message.channel.send(`Malformed command.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                if (numMessages > maxMessages) {
                    message.channel.send(`You can only delete a maximum of ${maxMessages} messages.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }

                message.delete();

                let commandWord: string = argsArray[0];
                switch (commandWord) {
                    case 'mentions':
                        {
                            let user: string = (await stringToMember(message.guild, argsArray[1], false, false, false)).id;
                            let criteria: purgeCommandCriteria = {
                                type: messageTypes.mention,
                                value: user
                            };
                            //@ts-ignore
                            let found = await DeleteLastXmessages(numMessages, message.channel, criteria);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            if (!found) {
                                message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                Bot.mStats.logMessageSend();
                            }
                            Bot.mStats.logCommandUsage(command.name, commandWord);
                            return true;
                        }
                    case 'startswith':
                        {
                            let startingString: string = argsArray.slice(1, argsArray.length - 1).join(" ");
                            let criteria: purgeCommandCriteria = {
                                value: startingString,
                                location: substringLocation.beginning
                            };
                            //@ts-ignore
                            let found = await DeleteLastXmessages(numMessages, message.channel, criteria);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            if (!found) {
                                message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                Bot.mStats.logMessageSend();
                            }
                            Bot.mStats.logCommandUsage(command.name, commandWord);
                            return true;
                        }
                    case 'endswith':
                        {
                            let endingString: string = argsArray.slice(1, argsArray.length - 1).join(" ");
                            let criteria: purgeCommandCriteria = {
                                value: endingString,
                                location: substringLocation.end
                            };
                            //@ts-ignore
                            let found = await DeleteLastXmessages(numMessages, message.channel, criteria);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            if (!found) {
                                message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                Bot.mStats.logMessageSend();
                            }
                            Bot.mStats.logCommandUsage(command.name, commandWord);
                            return true;
                        }
                    case 'contains':
                        {
                            let stringToFind: string = argsArray.slice(1, argsArray.length - 1).join(" ");
                            let criteria: purgeCommandCriteria = {
                                value: stringToFind,
                                location: substringLocation.anywhere
                            };
                            //@ts-ignore
                            let found = await DeleteLastXmessages(numMessages, message.channel, criteria);
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            if (!found) {
                                message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                Bot.mStats.logMessageSend();
                            }
                            return true;
                        }
                    case 'has':
                        {
                            let subCommandWord: string = argsArray[1];
                            commandWord += ` ` + subCommandWord;
                            let criteria: purgeCommandCriteria = {};
                            let validOption = true;
                            switch (subCommandWord) {
                                case 'text':
                                    criteria.type = messageTypes.text;
                                    break;
                                case 'file':
                                    criteria.type = messageTypes.file;
                                    break;
                                case 'img':
                                    criteria.type = messageTypes.image;
                                    break;
                                case 'invite':
                                    criteria.type = messageTypes.invite;
                                    break;
                                case 'link':
                                    criteria.type = messageTypes.url;
                                    break;
                                // // TODO: believed discord.js issue preventing message.author.bot boolean..
                                // case 'botmessage':
                                //     criteria.type = messageTypes.botMessage;
                                default:
                                    validOption = false;
                                    break;
                            }
                            if (!validOption) {
                                message.channel.send(`Malformed command.`);
                                Bot.mStats.logMessageSend();
                                return false;
                            } else {
                                //@ts-ignore
                                let found = await DeleteLastXmessages(numMessages, message.channel, criteria);
                                Bot.mStats.logResponseTime(command.name, requestTime);
                                if (!found) {
                                    message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                    Bot.mStats.logMessageSend();
                                }
                                Bot.mStats.logCommandUsage(command.name, commandWord);
                                return true;
                            }
                        }
                    default:
                        break;
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

/**
 * Will find take the last X messages from a TextChannel and check 
 * whether they meet the criteria provided, these are then returned
 * to be deleted using bulk delete, hence allowing for multitudes of
 * messages to be purged.
 * TODO: fetch them and delete on the fly
 *
 * @param {purgeCommandCriteria} criteria sets out the criteria that we would like to filter by
 * @param {number} numberOfMessages number of messages we should take from the channel (including those we can't delete / don't meet criteria)
 * @param {TextChannel} channel the channel we should take the messages from
 * @returns {boolean} an array of messages that can be deleted and meet the criteria
 */
async function DeleteLastXmessages(numberOfMessages: number, channel: TextChannel, criteria?: purgeCommandCriteria): Promise<boolean> {
    let found: boolean = false;
    let latest: string = ""
    for (let i = 0; i < Math.floor(numberOfMessages / 100); i++) {
        if (!criteria) {
            channel.bulkDelete(100);
            found = true;
        } else {
            let messages: Message[] = [];
            let rms = latest == "" ? await channel.fetchMessages({ limit: 100 }) : await channel.fetchMessages({ limit: 100, before: latest });
            for (const rm of rms) {
                if (valid(rm[1], criteria)) messages.push(rm[1]);
            }
            latest = rms.last().id;
            if (messages.length != 0) {
                found = true;
                await channel.bulkDelete(messages, true);
            }
        }
    }
    if (!criteria) {
        channel.bulkDelete(numberOfMessages % 100, true);
        return true
    } else {
        let messages: Message[] = [];
        let rms = await channel.fetchMessages({ limit: numberOfMessages % 100 });
        for (const rm of rms) {
            if (valid(rm[1], criteria)) messages.push(rm[1]);
        }
        if (messages.length != 0) {
            found = true;
            await channel.bulkDelete(messages);
        }
    }
    return found;
}


/**
 * Checks whether a message meets the given criteria and can be deleted
 * by the bot   
 *
 * @param {Message} message the message we are testing
 * @param {purgeCommandCriteria} criteria the criteria the message must meet
 * @returns {boolean} whether or not the message passed the criteria
 */
function valid(message: Message, criteria: purgeCommandCriteria): boolean {
    if (!message.deletable) return false;
    if (criteria.userID) {
        if (message.author.id != criteria.userID) return false;
    }
    if (criteria.value && criteria.location) {
        if (criteria.location == substringLocation.beginning) {
            if (!message.content.startsWith(criteria.value)) return false;
        }
        else if (criteria.location == substringLocation.anywhere) {
            if (!message.content.includes(criteria.value)) return false;
        }
        else if (criteria.location == substringLocation.end) {
            if (!message.content.endsWith(criteria.value)) return false;
        }
    }
    if (criteria.type) {
        if (criteria.type == messageTypes.text) {
            if (message.content == "") return false;
        }
        if (criteria.type == messageTypes.file) {
            if (message.attachments.size == 0) return false;
        }
        if (criteria.type == messageTypes.image) {
            let containsImage = false;
            for (const messageAttachment of message.attachments) {
                if (messageAttachment[1].width) containsImage = true;
            }
            if (!containsImage) return false;
        }
        if (criteria.type == messageTypes.url) {
            let regexp = /^(?:(?:https?|ftps?):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
            if (!regexp.test(message.content)) return false;
        }
        if (criteria.type == messageTypes.invite) {
            if (!(message.content.includes('discord.gg/') || message.content.includes('discordapp.com/invite/'))) return false;
        }
        // if (criteria.type == messageTypes.botMessage) {
        //     if (message.author.bot == false) return false;
        // }
        if (criteria.value && criteria.type == messageTypes.mention) {
            let mentions = false;
            for (const messageMention of message.mentions.users) {
                if (messageMention[1].id == criteria.value) mentions = true;
            }
            if (!mentions) return false;
        }
    }
    return true;
}

export default command;