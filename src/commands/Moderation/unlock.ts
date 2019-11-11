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
    help: {
        shortDescription: 'Unlocks a channel locked by the bot',
        longDescription: 'Unlocks a specified channel that was perviously locked by the bot',
        usages: [
            '{command} [channel]',
            '{command}'
        ],
        examples: [
            '{command}',
            '{command} #general'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            // check if the bot has permission to manage channels
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

            // create query to check if channel is locked
            let query = { guild: message.guild.id };
            query[`locks.${channel.id}`] = { $exists: true };
            let guildDoc = await Bot.database.mainDB.guilds.findOne(query, [`locks.${channel.id}.allowOverwrites`, `locks.${channel.id}.neutralOverwrites`]).exec();
            if (!guildDoc) { // if no guild with the locked channel was found
                message.channel.send('The channel isn\'t locked by the bot');
                Bot.mStats.logMessageSend();
                return false;
            }

            // remove pending unlock action
            Bot.pActions.removeLockChannel(message.guild.id, channel.id);
            // reset allow overwrites
            for (const id of guildDoc.toObject().locks[channel.id].allowOverwrites)
                await channel.overwritePermissions(id, { SEND_MESSAGES: true }, `Manual unlock by ${message.author.tag} (${message.author.id})`);
            // reset neutral overwrites
            for (const id of guildDoc.toObject().locks[channel.id].neutralOverwrites) {
                await channel.overwritePermissions(id, { SEND_MESSAGES: null }, `Manual unlock by ${message.author.tag} (${message.author.id})`);

                // if the overwrites for the ID are completely neutral delete the overwrite
                let permOverwrite = channel.permissionOverwrites.get(id);
                if (permOverwrite && !permOverwrite.allow && !permOverwrite.allow)
                    permOverwrite.delete();
            }

            // delete the locked channel from the database
            delete guildDoc.locks[channel.id];
            guildDoc.markModified(`locks.${channel.id}`);
            guildDoc.save();

            // send a unlock message to the channel
            if (channel.id != message.channel.id) {
                channel.send('Channel is unlocked now');
                Bot.mStats.logMessageSend();
            }

            // send confirmation message
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