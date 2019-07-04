import { Message, Guild, TextChannel } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToChannel } from '../../utils/parsers';
import { durations } from '../../utils/time';

var command: commandInterface = {
    name: 'unlock',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Unlocks a by the bot locked channel',
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
                        'value': 'Unlocks a specified channel that was perviously locked by the bot'
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
                        'name': 'Local Cooldown:',
                        'value': durationToString(command.cooldownLocal),
                        'inline': true
                    },
                    {
                        'name': 'Usage:',
                        'value': '{command} [channel]\n{command}'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} #general'.replace(/\{command\}/g, prefix + command.name)
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
                return false;
            }

            if (!message.guild.me.hasPermission('MANAGE_CHANNELS')) {
                message.channel.send('I don\'t have the `Manage Channels` permission');
                Bot.mStats.logMessageSend();
                return false;
            }

            // get specified channel
            let channel = stringToChannel(message.guild, args, true, false);
            if (!channel) {
                message.channel.send('Couldn\'t find specified channel');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!(channel instanceof TextChannel)) {
                message.channel.send('You can only unlock text channels');
                Bot.mStats.logMessageSend();
                return false;
            }

            let query = { guild: message.guild.id };
            query[`locks.${channel.id}`] = { $exists: true };
            let guildDoc = await Bot.database.mainDB.guilds.findOne(query, [`locks.${channel.id}.allowOverwrites`, `locks.${channel.id}.neutralOverwrites`]).exec();
            if (!guildDoc) {
                message.channel.send('The channel isn\'t locked by the bot');
                Bot.mStats.logMessageSend();
                return false;
            }

            Bot.pActions.removeLockChannel(message.guild.id, channel.id);
            for (const id of guildDoc.toObject().locks[channel.id].allowOverwrites)
                await channel.overwritePermissions(id, { SEND_MESSAGES: true }, `Manual unlock by ${message.author.tag} (${message.author.id})`);
            for (const id of guildDoc.toObject().locks[channel.id].neutralOverwrites) {
                await channel.overwritePermissions(id, { SEND_MESSAGES: null }, `Manual unlock by ${message.author.tag} (${message.author.id})`);

                let permOverwrite = channel.permissionOverwrites.get(id);
                if (permOverwrite && !permOverwrite.allow && !permOverwrite.allow)
                    permOverwrite.delete();
            }

            delete guildDoc.locks[channel.id];
            guildDoc.markModified(`locks.${channel.id}`);
            guildDoc.save();

            if (channel.id != message.channel.id) {
                channel.send('Channel is unlocked now');
                Bot.mStats.logMessageSend();
            }

            Bot.mStats.logResponseTime(command.name, requestTime);
            message.channel.send(`:white_check_mark: **Successfully unlocked ${channel}**`);
            Bot.mStats.logCommandUsage(command.name);
            Bot.mStats.logMessageSend();
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;