import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import request = require("request");

function selectRandom(array: any[]) {
    return array[Math.floor(Math.random() * Math.floor(array.length))];
}

function sendRandomImage(message: Message, API: string, requestTime: [number,number]) {
    new Promise<RichEmbed>((resolve, reject) => {
        request.get(API, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            var setname = message.author.username;
            if (message.member.nickname != null) {
                setname = message.member.nickname;
            }
            var embed = new RichEmbed();
            embed.setAuthor('requested by: ' + setname + ' (' + message.author.tag + ')', message.author.avatarURL);
            embed.setImage(JSON.parse(body).link);
            embed.setColor(Bot.database.settingsDB.cache.embedColors.default);
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(embed);
            Bot.mStats.logMessageSend();
            resolve(embed);
        })

    });
}

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number,number]) => {
    try {
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return false;
        }
        args = args.toLowerCase();

        var apis = Bot.database.settingsDB.cache.commands[command.name].apis;
        var animals = Object.keys(apis);
        if (args == 'random') {
            await sendRandomImage(message, apis[selectRandom(animals)], requestTime);
            Bot.mStats.logCommandUsage(command.name, 'random');
        } else {
            if (animals.includes(args)) {
                await sendRandomImage(message, apis[args], requestTime);
                Bot.mStats.logCommandUsage(command.name, args);
            } else {
                message.channel.send(`That isn't a animal or isn't yet supported.`)
                Bot.mStats.logMessageSend();
            }
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'animal';
command.path = '';
command.dm = true;
command.permLevel = permLevels.member;
command.togglable = true;
command.shortHelp = 'returns cute animal images';
command.embedHelp = async function (guild: Guild) {
    var prefix = await Bot.database.getPrefix(guild);
    return {
        'embed': {
            'color': Bot.database.settingsDB.cache.embedColors.help,
            'author': {
                'name': 'Command: ' + prefix + command.name
            },
            'fields': [
                {
                    'name': 'Description:',
                    'value': 'Gets image of specified animal.'
                },
                {
                    'name': 'Valid animals:',
                    'value': 'cat, dog, fox, panda, red-panda, bird, pikachu'
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
                    'value': '{command} [animal]\n{command} random'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} bird\n{command} random'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;