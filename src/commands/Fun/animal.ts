import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import request = require("request");

/**
 * selects a random element of a array
 *
 * @param {any[]} array
 * @returns
 */
function selectRandom(array: any[]) {
    return array[Math.floor(Math.random() * Math.floor(array.length))];
}

/**
 * sends a embed with a random image that the given api returned
 *
 * @param {Message} message messages to reply to
 * @param {string} API API which to ask for a image from
 * @param {[number,number]} requestTime when image was requested to measure response time
 */
function sendRandomImage(message: Message, API: string, requestTime: [number, number]) {
    new Promise<RichEmbed>((resolve, reject) => {
        request.get(API, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');

            }
            // build embed
            var setname = message.author.username;
            if (message.member.nickname != null) {
                setname = message.member.nickname;
            }
            var embed = new RichEmbed();
            embed.setAuthor('requested by: ' + setname + ' (' + message.author.tag + ')', message.author.displayAvatarURL);
            embed.setImage(JSON.parse(body).link);
            embed.setColor(Bot.database.settingsDB.cache.embedColors.default);

            // send embed
            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(embed);
            Bot.mStats.logMessageSend();
            resolve(embed);
        })

    });
}

var command: commandInterface = {
    name: 'animal',
    path: '',
    dm: true,
    permLevel: permLevels.member,
    togglable: true,
    help: {
        shortDescription: 'Returns cute animal images',
        longDescription: 'Gets image of specified animal.',
        usages: [
            '{command} [animal]',
            '{command} random'
        ],
        examples: [
            '{command} bird',
            '{command} random'
        ],
        additionalFields: [
            {
                name: 'Valid animals:',
                value: 'cat, dog, fox, panda, red-panda, bird, pikachu'
            }
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // if no argument was given send the help embed
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            args = args.toLowerCase();

            var apis = Bot.database.settingsDB.cache.commands[command.name].apis; // get api urls
            var animals = Object.keys(apis);

            if (args == 'random') { // when it should randomly choose a animal
                await sendRandomImage(message, apis[selectRandom(animals)], requestTime);
                Bot.mStats.logCommandUsage(command.name, 'random');
            } else {
                if (animals.includes(args)) { // if a api for the animal is specified
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
};

export default command;