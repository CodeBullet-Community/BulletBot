import { Message, RichEmbed, Guild, GuildMember, Role, MessageMentions } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel, stringToRole, stringToMember } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { logTypes, staffObject } from '../../database/schemas';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };

command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number,number]) => {
    try {
        var argIndex = 0;
        if (args.length == 0) {
            message.channel.send(await command.embedHelp(message.guild));
            Bot.mStats.logMessageSend();
            return;
        }
        var argsArray = args.split(' ').filter(x => x.length != 0);
        switch (argsArray[argIndex]) {
            case 'rem':
            case 'add':
                argIndex++;
                if (!argsArray[argIndex]) {
                    message.channel.send('Please enter a user or role.');
                    Bot.mStats.logMessageSend();
                    return;
                }
                var role = stringToRole(message.guild, argsArray[argIndex]);
                if (typeof (role) == 'string') {
                    message.channel.send('You can\'t add everyone or here to a rank.');
                    Bot.mStats.logMessageSend();
                    return;
                }
                var user: GuildMember;
                if (!role) {
                    user = stringToMember(message.guild, argsArray[argIndex]);
                    if (!user) {
                        message.channel.send('There isn\'t a role or user called ' + argsArray[argIndex]);
                        Bot.mStats.logMessageSend();
                        return;
                    }
                }
                if (argsArray[0] == 'add') {
                    if (await Bot.database.addToRank(message.guild.id, 'immune', (role ? role.id : undefined), (user ? user.id : undefined))) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`Successfully added immunity to ${role ? role.name : user.toString()}`);
                        Bot.logger.logStaff(message.guild, message.member, logTypes.add, 'immune', role, (user ? user.user : undefined));
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`${role ? role.name : user.toString()} is already immune`);
                    }
                    Bot.mStats.logCommandUsage(command.name, 'add');
                } else {
                    if (await Bot.database.removeFromRank(message.guild.id, 'immune', (role ? role.id : undefined), (user ? user.id : undefined))) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`Successfully removed immunity from ${role ? role.name : user.toString()}`);
                        Bot.logger.logStaff(message.guild, message.member, logTypes.remove, 'immune', role, (user ? user.user : undefined));
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`${role ? role.name : user.toString()} isn't immune`);
                    }
                    Bot.mStats.logCommandUsage(command.name, 'remove');
                }
                Bot.mStats.logMessageSend();
                break;
            case 'list':
                var staffDoc = await Bot.database.findStaffDoc(message.guild.id);
                var roles = 'No Roles';
                var users = 'No Users';
                if (staffDoc) {
                    var staffObject: staffObject = staffDoc.toObject();
                    if (staffObject.immune.roles.length > 0) {
                        roles = '';
                        for (const roleID of staffObject.immune.roles) {
                            var roleObject = message.guild.roles.get(roleID);
                            roles += roleObject.toString() + '\n';
                        }
                    }
                    if (staffObject.immune.users.length > 0) {
                        users = '';
                        for (const roleID of staffObject.immune.users) {
                            var user = message.guild.members.get(roleID);
                            users += user.toString() + '\n';
                        }
                    }
                }
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send({
                    'embed': {
                        'color': Bot.database.settingsDB.cache.defaultEmbedColor,
                        'timestamp': new Date().toISOString(),
                        'author': {
                            'name': 'Immune:',
                            'icon_url': Bot.client.user.avatarURL
                        },
                        'fields': [
                            {
                                'name': 'Roles:',
                                'value': roles,
                                'inline': true
                            },
                            {
                                'name': 'Users:',
                                'value': users,
                                'inline': true
                            }
                        ]
                    }
                });
                Bot.mStats.logCommandUsage(command.name, 'list');
                Bot.mStats.logMessageSend();
                break;
            default:
                message.channel.send('Unkown action ' + argsArray[argIndex]);
                Bot.mStats.logMessageSend();
                break;
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'immune';
command.path = '';
command.dm = false;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'for managing the immune rank';
command.embedHelp = async function (guild: Guild) {
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
                    'value': 'let\'s you add, remove and list immune roles and users'
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
                    'value': '{command} add [role/user]\n{command} rem [role/user]\n{command} list'.replace(/\{command\}/g, prefix + command.name)
                },
                {
                    'name': 'Example:',
                    'value': '{command} add @immune\n{command} rem @jeff#1234\n{command} list'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;