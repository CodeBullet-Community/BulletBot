import { Message, Guild, TextChannel } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToDuration, stringToChannel } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { staffObject, guildObject } from '../../database/schemas';

async function getIDsToOverwrite(channel: TextChannel) {
    let denyIDs: string[] = [];
    let allowIDs: string[] = [];

    for (const overwrite of channel.permissionOverwrites.array()) {
        denyIDs.push(overwrite.id);
    }

    let staffDoc = await Bot.database.findStaffDoc(channel.guild.id);
    if (staffDoc) {
        let staffObject: staffObject = staffDoc.toObject();
        allowIDs = allowIDs.concat(staffObject.admins.users)
            .concat(staffObject.mods.users)
            .concat(staffObject.immune.users)
            .concat(staffObject.admins.roles)
            .concat(staffObject.mods.roles)
            .concat(staffObject.immune.roles);
        denyIDs = denyIDs.filter(id => !allowIDs.includes(id));
    }

    let allowOverwrites: string[] = []; // ids that originally had a allow overwrite for sending messages
    let neutralOverwrites: string[] = []; // ids that originally had a neutral overwrite for sending messages

    for (let i = 0; i < allowIDs.length;) {
        let permOverwrite = channel.permissionOverwrites.get(allowIDs[i]);
        if (permOverwrite && (permOverwrite.allowed.has('SEND_MESSAGES') || permOverwrite.denied.has('SEND_MESSAGES'))) {
            allowIDs.splice(i, 1);
        } else {
            neutralOverwrites.push(allowIDs[i]);
            i++;
        }
    }

    for (let i = 0; i < denyIDs.length;) {
        let permOverwrite = channel.permissionOverwrites.get(denyIDs[i]);
        if (permOverwrite && permOverwrite.denied.has('SEND_MESSAGES')) {
            denyIDs.splice(i, 1);
            continue;
        }

        if (permOverwrite && permOverwrite.allowed.has('SEND_MESSAGES')) {
            allowOverwrites.push(denyIDs[i]);
        } else {
            neutralOverwrites.push(denyIDs[i]);
        }
        i++;
    }

    return { allow: allowIDs, deny: denyIDs, allowOverwrites: allowOverwrites, neutralOverwrites: neutralOverwrites };
}

var command: commandInterface = {
    name: 'lock',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Lock a channel for normal members',
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
                        'value': 'Removes the write permissions of all normal members. Immune get excluded.'
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
                        'value': '{command} [channel]\n{command} [channel] [time]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} #general\n{command} #general 2h10m'.replace(/\{command\}/g, prefix + command.name)
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
            // check if the bot even has the right permissions
            if (!message.guild.me.hasPermission('MANAGE_CHANNELS')) {
                message.channel.send('I don\'t have the `Manage Channels` permission');
                Bot.mStats.logMessageSend();
                return false;
            }
            let argIndex = 0;
            let argsArray = args.split(' ').filter(x => x.length != 0);

            // get specified channel
            let channel = stringToChannel(message.guild, argsArray[argIndex], true, false);
            if (!channel) {
                message.channel.send('Couldn\'t find specified channel');
                Bot.mStats.logMessageSend();
                return false;
            }
            if (!(channel instanceof TextChannel)) {
                message.channel.send('You can only lock text channels');
                Bot.mStats.logMessageSend();
                return false;
            }
            argIndex++;

            // get specified time
            let time = stringToDuration(argsArray[argIndex]);
            let timeString = time ? durationToString(time) : 'an indefinite time';

            // get ids that need to be overwritten
            let overwrites = await getIDsToOverwrite(channel);

            let query = { guild: message.guild.id };
            query[`locks.${channel.id}`] = { $exists: true };
            let existingLock = await Bot.database.mainDB.guilds.findOne(query, [`locks.${channel.id}.allowOverwrites`, `locks.${channel.id}.neutralOverwrites`]).exec();

            if (!existingLock) { // check if the channel is already locked by the bot
                if (!overwrites.allow.length && !overwrites.deny.length) { // check if the bot would even modify the channels overwrites
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send(`:x: **${channel} already has role perms that are considered locked**`);
                    Bot.mStats.logCommandUsage(command.name, 'failedCreate');
                    Bot.mStats.logMessageSend();
                    return;
                }

                // modify overwrites
                for (const id of overwrites.deny) channel.overwritePermissions(id, { SEND_MESSAGES: false });
                for (const id of overwrites.allow) channel.overwritePermissions(id, { SEND_MESSAGES: true });

                // add the channel to the locks property in the guild doc
                let updateDoc = {};
                updateDoc[`locks.${channel.id}`] = {
                    allowOverwrites: overwrites.allowOverwrites,
                    neutralOverwrites: overwrites.neutralOverwrites
                }
                if (time) updateDoc[`locks.${channel.id}`].until = message.createdTimestamp + time;
                Bot.database.mainDB.guilds.updateOne({ guild: message.guild.id }, updateDoc).exec();
            } else {
                // update the until property in the guild doc
                let updateDoc = {};
                if (time) {
                    updateDoc[`locks.${channel.id}.until`] = message.createdTimestamp + time;
                } else {
                    updateDoc['$unset'] = {};
                    updateDoc['$unset'][`locks.${channel.id}.until`] = "";
                    Bot.pActions.removeLockChannel(message.guild.id, channel.id); // also remove the pending unlock
                }
                Bot.database.mainDB.guilds.updateOne({ guild: message.guild.id }, updateDoc).exec();

                // get overwrites ids from guild doc (it only needs to be put into allow, because the arrays get merged anyways later)
                let guildObject: guildObject = existingLock.toObject();
                overwrites.allowOverwrites = guildObject.locks[channel.id].allowOverwrites;
                overwrites.neutralOverwrites = guildObject.locks[channel.id].neutralOverwrites;
            }

            // add/change pending unlock if needed
            if (time) Bot.pActions.addLockChannel(message.guild.id, channel.id, overwrites.allowOverwrites, overwrites.neutralOverwrites, message.createdTimestamp + time, message.createdTimestamp);

            if (channel.id != message.channel.id) {
                channel.send(`Channel has been locked for ${timeString}`);
                Bot.mStats.logMessageSend();
            }

            Bot.mStats.logResponseTime(command.name, requestTime);
            if (existingLock) {
                message.channel.send(`:white_check_mark: **Lock time for ${channel} has been changed to ${timeString}**`);
                Bot.mStats.logCommandUsage(command.name, 'change');
            } else {
                message.channel.send(`:white_check_mark: **${channel} has been locked for ${timeString}**`);
                Bot.mStats.logCommandUsage(command.name, 'create');
            }
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