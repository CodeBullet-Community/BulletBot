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
            return false;
        }
        var argsArray = args.split(' ').filter(x => x.length != 0);
        switch (argsArray[argIndex]) {
            case 'rem':
            case 'add':
                argIndex++;
                if (!argsArray[argIndex]) {
                    message.channel.send('Please enter a user or role.');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                var role = stringToRole(message.guild, argsArray[argIndex]);
                if (typeof (role) == 'string') {
                    message.channel.send('You can\'t add everyone or here to a rank.');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                var user: GuildMember;
                if (!role) {
                    user = await stringToMember(message.guild, argsArray[argIndex]);
                    if (!user) {
                        message.channel.send('There isn\'t a role or user called that way');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                }
                if (argsArray[0] == 'add') {
                    if (await Bot.database.addToRank(message.guild.id, 'admins', (role ? role.id : undefined), (user ? user.id : undefined))) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`Successfully added ${role ? role.name : user.toString()} to admins`);
                        Bot.logger.logStaff(message.guild, message.member, logTypes.add, 'admins', role, (user ? user.user : undefined));
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`${role ? role.name : user.toString()} is already a admin`);
                    }
                    Bot.mStats.logCommandUsage(command.name, 'add');
                } else {
                    if (await Bot.database.removeFromRank(message.guild.id, 'admins', (role ? role.id : undefined), (user ? user.id : undefined))) {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`Successfully removed ${role ? role.name : user.toString()} from admins`);
                        Bot.logger.logStaff(message.guild, message.member, logTypes.remove, 'admins', role, (user ? user.user : undefined));
                    } else {
                        Bot.mStats.logResponseTime(command.name, requestTime);
                        message.channel.send(`${role ? role.name : user.toString()} isn't in rank admins`);
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
                    if (staffObject.admins.roles.length > 0) {
                        roles = '';
                        for (const roleID of staffObject.admins.roles) {
                            var roleObject = message.guild.roles.get(roleID);
                            roles += roleObject.toString() + '\n';
                        }
                    }
                    if (staffObject.admins.users.length > 0) {
                        users = '';
                        for (const roleID of staffObject.admins.users) {
                            var user = message.guild.members.get(roleID);
                            users += user.toString() + '\n';
                        }
                    }
                }
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send({
                    'embed': {
                        'color': Bot.database.settingsDB.cache.embedColors.default,
                        'timestamp': new Date().toISOString(),
                        'author': {
                            'name': 'Admins:',
                            'icon_url': Bot.client.user.displayAvatarURL
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
                message.channel.send('Unkown action. Use list, add or rem');
                Bot.mStats.logMessageSend();
                break;
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError(e, command.name);
    }
}

command.name = 'admin';
command.path = '';
command.dm = false;
command.permLevel = permLevels.admin;
command.togglable = false;
command.shortHelp = 'for managing the admin rank';
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
                    'value': 'let\'s you add, remove and list admin roles and users'
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
                    'value': '{command} add @admins\n{command} rem @jeff#1234\n{command} list'.replace(/\{command\}/g, prefix + command.name)
                }
            ]
        }
    }
};

export default command;