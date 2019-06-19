import { Message, Guild, TextChannel, MessageAttachment, User } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { Collection } from 'mongoose';

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
    botMessage = 6,
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
                        'value': '{command} [number of messages to delete]\n{command} [user] [number of messages to delete]\n{command} fromuser [user] [number of messages to delete]\n{command} endswith [content] [number of messages to delete]\n{command} startswith [content] [number of messages to delete]\n{command} contains [content] [number of messages to delete]\n{command} has [content: img | text | file | link | invite] [number of messages to delete]'.replace(/\{command\}/g, prefix + command.name)
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
            if (argsArray.length == 1) {
                if (!Number.isInteger(parseInt(argsArray[0])))
                {
                    message.channel.send(await command.embedHelp(message.guild));
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                await message.delete();
                let numberOfMessages = parseInt(argsArray[0]);
                //@ts-ignore
                let worked = await DeleteLastXmessages(numberOfMessages, message.channel);
                
                Bot.mStats.logResponseTime(command.name, requestTime);
                Bot.mStats.logCommandUsage(command.name, `${numberOfMessages - 1}`);
            }
            else if (argsArray.length == 2) // [user] [num messages]
            {
                let criteria: purgeCommandCriteria = {
                    userID: argsArray[0]
                }
                if (!Number.isInteger(parseInt(argsArray[0])))
                {
                    message.channel.send(await command.embedHelp(message.guild));
                    Bot.mStats.logMessageSend();
                    return false; // was unsuccessful
                }
                await message.delete();
                let numberOfMessages = parseInt(argsArray[0]);
                //@ts-ignore
                let found: boolean = await DeleteLastXmessages(numberOfMessages, message.channel, criteria);
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
async function DeleteLastXmessages(numberOfMessages: number, channel: TextChannel, criteria?: purgeCommandCriteria): Promise<boolean>
{
    let found: boolean = false;
    let latest: string = ""
    for (let i = 0; i < Math.floor(numberOfMessages/100); i++)
    {
        console.log("we got here :("); // why does this happen 2x when i call it with like 3!!
        if (!criteria) {
            channel.bulkDelete(100);
            found = true;
        } else {
            let messages: Message[] = [];
            let rms = latest == "" ? await channel.fetchMessages({limit: 100}) : await channel.fetchMessages({limit: 100, before: latest});
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
        let rms = await channel.fetchMessages({limit: numberOfMessages % 100});
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
function valid(message: Message, criteria: purgeCommandCriteria) : boolean
{
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
            let regexp =  /^(?:(?:https?|ftps?):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
            if (!regexp.test(message.content)) return false;
        }
        if (criteria.type == messageTypes.invite) {
            if (!message.content.includes('discord.gg/'||'discordapp.com/invite/')) return false;
        }
        if (criteria.type == messageTypes.botMessage) {
            if (!message.author.bot) return false;
        }
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