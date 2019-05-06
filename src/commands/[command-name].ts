// this file will be ignored by the compiler and is just to showcase how to make a command
// those imports have to of course be changed depending on the path
import { Message, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { permLevels } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';
import { durations } from '../utils/time';

var command: commandInterface = {
    name: '[command name]', // command name must be lowercase letters with no spaces
    path: '[path]', // if you don't want any path defined just do ''. example path 'cate/subcate'
    dm: false, // if this command can be used in dms
    permLevel: permLevels.mod,  // what minimum perm level is required
    togglable: false, // if the command can be disabled by the commands command
    cooldownLocal: durations.second * 10, // local cooldown in ms, if the command shouldn't have any local cooldown, remove the property
    cooldownGlobal: durations.second * 10, // global cooldown in ms, if the command shouldn't have any global cooldown, remove the property
    shortHelp: '[short desc]', // very short desc of what the command does
    embedHelp: async function (guild: Guild) {
        var prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.helpEmbedColor,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': '[detailed desc]' // more detailed desc
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
                    { // remove this if the command doesn't have local cooldown
                        'name': 'Local Cooldown:',
                        'value': command.cooldownLocal + 'ms',
                        'inline': true
                    },
                    { // remove this if the command doesn't have global cooldown
                        'name': 'Global Cooldown:',
                        'value': command.cooldownGlobal + 'ms',
                        'inline': true
                    },
                    {
                        'name': 'Usage:', // all possible inputs to the guild, the arguments should be named
                        'value': '{command} [arg]\n{command}'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:', // example use of the command
                        'value': '{command} fish\n{command}'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            // REMEMBER: return true if the command was successfully executed (meaning the users intention where fulfilled)
            //           return false if the command execution was unsuccessful (then the cooldown doesn't get started)

            // only put this here when the command always requires arguments
            // if no argument is given then it will send the embed help
            if (args.length == 0) {
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false; // was unsuccessful
            }
            // if the command has several arguments use argIndex, as it's easier to implement optional arguments and new arguments
            var argIndex = 0;
            var argsArray = args.split(' ').filter(x => x.length != 0); // this ensures that double spaces get filtered out, so a typo won't make the command not work

            // before the first message or response send (can also be in form of a reaction) `Bot.mStats.logResponseTime(command.name, requestTime);` should be called. 
            // This will log the amount of time the bot needed on process the request, excluding the ping latency of course
            Bot.mStats.logResponseTime(command.name, requestTime);

            if (argsArray[argIndex] == 'hello') {
                message.channel.send("hello there");
                // every time a message is send, the 'Bot.mStats.logMessageSend();' function should be called
                Bot.mStats.logMessageSend();
                // every time the command was successfully executed the logCommandUsage should be called. 
                //The first argument is always the command name, but the second one is OPTIONAL and is for specifying the sub command usage like 'list' or 'remove'
                Bot.mStats.logCommandUsage(command.name, 'hello');
            } else {
                message.channel.send("bye");
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'bye');
            }
            return true; // was successful
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false; // was unsuccessful
        }
    }
};

export default command;