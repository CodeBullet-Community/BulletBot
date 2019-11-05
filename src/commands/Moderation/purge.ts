// purge.ts: this file defines the ?!purge command and implements its features
// TODO: add a since [message ID]  subcommand
import { Message, Guild, TextChannel, SnowflakeUtil } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';

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
    // botMessage = 6, // for some unknown reason we can't
    // filter on this.. potentially an implementation issue
    mention = 7
}

// for the contains etc. subfunctions (location of the text)
enum substringLocation {
    beginning = 1,
    anywhere = 2,
    end = 3
}

/**
 * An interface which describes the different methods messages can be filtered.
 * It is used almost as a parameter pack.. perhaps not the best implemention.
 * @member {messageTypes?} type    what type of message we're purging
 * @member {substringLocation?} location    where we will search for a certain piece of text
 * @member {string?} value    what we would like to check for based on other options
 * @member {string?} userID    user-specific purges
 * @interface purgeCommandCriteria
 */
interface purgeCommandCriteria {
    type?: messageTypes,
    location?: substringLocation,
    value?: string,
    userID?: string
}

// basic command structure
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
                        'name': 'Example:', // TODO: add more examples and potentially explanations
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

            // checks whether there is a maximum purge number. if not, it will use
            // 1000 as the default and warn you about it being unconfigured
            let maxMessages = 1000;
            if (Bot.database.settingsDB.cache.commands[command.name] && Bot.database.settingsDB.cache.commands[command.name].maxMessages) {
                maxMessages = Bot.database.settingsDB.cache.commands[command.name].maxMessages;
            } else {
                console.warn(`WARNINGS: PLEASE SET THE 'maxMessages' PROPERTY FOR THE PURGE COMMAND IN THE GLOBAL DOC`);
            }

            // the only possible argument is a number
            if (argsArray.length == 1) {
                // ensures we don't delete 'mentions' etc. messages
                if (!Number.isInteger(parseInt(argsArray[0]))) {
                    message.channel.send(`Malformed command.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }

                let numberOfMessages = parseInt(argsArray[0]);

                // checks whether it excedes the maximum or not greater than 0
                if (numberOfMessages > maxMessages) {
                    message.channel.send(`You can only delete a maximum of ${maxMessages} messages.`);
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                if (numberOfMessages <= 0) {
                    message.channel.send(`The number of messages must be greater than 0.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // delete the ?!purge command
                await message.delete();

                // this is due to the cast from a guildchannel to a textchannel
                // TODO: cast this rather than resorting to unsafe code
                //@ts-ignore
                let found = await DeleteLastXMessages(numberOfMessages, message.channel, message.id); // find and delete
                Bot.mStats.logResponseTime(command.name, requestTime);

                // checks whether any were deleted
                if (!found) {
                    message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                    Bot.mStats.logMessageSend();
                }
                Bot.mStats.logCommandUsage(command.name);
                return true;
            }

            // 2 arguments forces it to be a user-specific deletion
            else if (argsArray.length == 2) { // [user] [num messages]

                let user = await stringToMember(message.guild, argsArray[0], false, false, false);
                if (!user) {
                    message.channel.send(`Malformed command.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // set up our 'parameter pack'
                let criteria: purgeCommandCriteria = {
                    userID: user.id
                }

                // type checking and bounds checking
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
                if (numberOfMessages <= 0) {
                    message.channel.send(`The number of messages must be greater than 0.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // delete the ?!purge command
                await message.delete();

                // delete messages
                // TODO: cast this rather than resorting to unsafe code
                //@ts-ignore
                let found: boolean = await DeleteLastXMessages(numberOfMessages, message.channel, message.id, criteria);
                Bot.mStats.logResponseTime(command.name, requestTime);

                if (!found) {
                    message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                    Bot.mStats.logMessageSend();
                }
                Bot.mStats.logCommandUsage(command.name, `user`);
                return true;
            }
            else {
                // TS does not permit us to reuse variables in separate cases of a switch statement
                // we know that the number of messages will always be the last element
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
                if (numMessages <= 0) {
                    message.channel.send(`The number of messages must be greater than 0.`);
                    Bot.mStats.logMessageSend();
                    return false;
                }

                // delete the ?!purge command
                await message.delete();

                // switching between the different subfunctions
                let commandWord: string = argsArray[0];
                switch (commandWord) {
                    case 'mentions':
                        {
                            // parse the userID
                            let user: string = (await stringToMember(message.guild, argsArray[1], false, false, false)).id;
                            let criteria: purgeCommandCriteria = {
                                type: messageTypes.mention,
                                value: user
                            };

                            // Delete messages
                            // TODO: cast this rather than resorting to unsafe code
                            //@ts-ignore
                            let found = await DeleteLastXMessages(numMessages, message.channel, message.id, criteria);
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
                            // takes the string from the function arguments, allows spaces.
                            let startingString: string = argsArray.slice(1, argsArray.length - 1).join(" ");

                            let criteria: purgeCommandCriteria = {
                                value: startingString,
                                location: substringLocation.beginning // 'startswith'
                            };

                            // Delete messages
                            // TODO: cast this rather than resorting to unsafe code
                            //@ts-ignore
                            let found = await DeleteLastXMessages(numMessages, message.channel, message.id, criteria);
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
                            // Takes the string, allowing for spaces
                            let endingString: string = argsArray.slice(1, argsArray.length - 1).join(" ");

                            let criteria: purgeCommandCriteria = {
                                value: endingString,
                                location: substringLocation.end // 'endswith'
                            };

                            // Delete messages
                            // TODO: cast this rather than resorting to unsafe code
                            //@ts-ignore
                            let found = await DeleteLastXMessages(numMessages, message.channel, message.id, criteria);
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
                            // Takes the string, allowing for spaces.
                            let stringToFind: string = argsArray.slice(1, argsArray.length - 1).join(" ");

                            let criteria: purgeCommandCriteria = {
                                value: stringToFind,
                                location: substringLocation.anywhere
                            };

                            // Delete messages
                            // TODO: cast this rather than resorting to unsafe code
                            //@ts-ignore
                            let found = await DeleteLastXMessages(numMessages, message.channel, message.id, criteria);
                            Bot.mStats.logResponseTime(command.name, requestTime);

                            if (!found) {
                                message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                Bot.mStats.logMessageSend();
                            }
                            return true;
                        }
                    case 'has':
                        {
                            let subCommandWord: string = argsArray[1]; // switching on sub sub function
                            commandWord += ` ` + subCommandWord; // for logging purposes
                            let criteria: purgeCommandCriteria = {};
                            let validOption = true; // whether or not to abort (not using an if...else if..else chain

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
                                // // TODO: believed that discord.js issue preventing message.author.bot boolean..
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
                                // Delete messages
                                // TODO: cast this rather than resorting to unsafe code
                                //@ts-ignore
                                let found = await DeleteLastXMessages(numMessages, message.channel, message.id, criteria);
                                Bot.mStats.logResponseTime(command.name, requestTime);

                                if (!found) {
                                    message.channel.send(`I couldn't find any messages based on your criteria/range.`);
                                    Bot.mStats.logMessageSend();
                                }
                                Bot.mStats.logCommandUsage(command.name, commandWord);
                                return true;
                            }
                        }
                    // TS requires it.
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
 * TODO: fetch them and delete on the fly?
 * TODO: part kf the above todo, delete x messages rather than from x messages, this requires safety if there arent that many messages (or any at all)
 *
 * @param {purgeCommandCriteria} criteria    sets out the criteria that we would like to filter by
 * @param {number} numberOfMessages    number of messages we should take from the channel (including those we can't delete / don't meet criteria)
 * @param {TextChannel} channel the    channel we should take the messages from
 * @param {string} requestSnowflake ID of the message that requested it
 * @returns {boolean}    whether any messages were deleted or not
 */
async function DeleteLastXMessages(numberOfMessages: number, channel: TextChannel, requestSnowflake: string, criteria?: purgeCommandCriteria): Promise<boolean> {
    let found: boolean = false;
    let lastSnowflake = requestSnowflake; // only delete messages before the purge was requested

    // so the query doesn't return messages older then 14 days
    let afterSnowflake = SnowflakeUtil.generate(Date.now() - durations.day * 14);

    // we can delete up to 100 at a time

    while (numberOfMessages != 0) {
        let nMessages = numberOfMessages % 100 ? numberOfMessages % 100 : 100; // how many messages to delete in this iteration

        if (!criteria) { // speeding up...
            numberOfMessages -= (await channel.bulkDelete(nMessages, true)).size; // 'true' filters those we can't delete
            found = true;
        } else {
            let result = await bulkDeleteByCriteria(channel, nMessages, criteria, afterSnowflake, lastSnowflake);
            found = found || result.found; // only set if found isn't already true
            lastSnowflake = result.lastSnowflake;
            numberOfMessages -= result.nMessages;
        }
    }

    return found;
}

async function bulkDeleteByCriteria(channel: TextChannel, nMessages: number, criteria: purgeCommandCriteria, afterSnowflake?: string, beforeSnowflake?: string) {
    afterSnowflake = afterSnowflake || SnowflakeUtil.generate(Date.now() - durations.day * 14);
    nMessages = nMessages > 100 ? 100 : nMessages; // you can't query more than 100 messages
    beforeSnowflake = beforeSnowflake || undefined;

    // get (max 100) messages which are younger then 14 days (and optional older then another message)
    let returnedMessages = await channel.fetchMessages({ limit: nMessages, after: afterSnowflake, before: beforeSnowflake });

    // iterates through the past x messages checking whether it meets the criteria
    // if so, it adds its ID to a list to be deleted
    let messages: Message[] = [];
    for (const message of returnedMessages) {
        if (valid(message[1], criteria)) messages.push(message[1]);
    }

    let found = false;
    // delete found message if there are any
    if (messages.length != 0) {
        await channel.bulkDelete(messages, true); // 'true' filters those we can't delete
        found = true;
    }

    return { found: found, nMessages: messages.length, lastSnowflake: returnedMessages.last() ? returnedMessages.last().id : undefined };
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
            if (message.content == "") return false; // just images etc.
        }
        if (criteria.type == messageTypes.file) {
            if (message.attachments.size == 0) return false; // if 0.. no attachments.
        }
        if (criteria.type == messageTypes.image) {
            let containsImage = false;
            for (const messageAttachment of message.attachments) {
                if (messageAttachment[1].width) containsImage = true;
            }
            if (!containsImage) return false;
        }
        if (criteria.type == messageTypes.url) {
            // checks for URLs ip too not local ips and a whole lot more (ftp+http)(s)
            let regexp = /^(?:(?:https?|ftps?):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
            if (!regexp.test(message.content)) return false;
        }
        // does not ban discord.io etc. as they're not official and often require interaction from the user
        if (criteria.type == messageTypes.invite) {
            if (!(message.content.includes('discord.gg/') || message.content.includes('discordapp.com/invite/'))) return false;
        }
        // Doesn't work for some reason.. potentially an API/Lib error.. waiting on it
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
