import { Message, RichEmbed, Guild, GuildMember, Role, MessageMentions } from 'discord.js';
import { commandInterface } from '../../commands';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, stringToChannel, stringToRole, stringToMember } from '../../utils/parsers';
import { permLevels } from '../../utils/permissions';
import { logTypes, staffObject } from '../../database/schemas';

var command: commandInterface = {
    name: 'mod',
    path: '',
    dm: false,
    permLevel: permLevels.admin,
    togglable: false,
    help: {
        shortDescription: 'for managing the mod rank',
        longDescription: 'let\'s you add, remove and list mod roles and users',
        usages: [
            '{command} add [role/user]',
            '{command} rem [role/user]',
            '{command} list'
        ],
        examples: [
            '{command} add @mods',
            '{command} rem @jeff#1234',
            '{command} list'
        ]
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            var argIndex = 0;
            if (args.length == 0) { // send help embed if no arguments provided
                message.channel.send(await Bot.commands.getHelpEmbed(command, message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }
            var argsArray = args.split(' ').filter(x => x.length != 0); // split arguments string by spaces
            switch (argsArray[argIndex]) { // the different actions
                case 'rem':
                case 'add':
                    argIndex++;
                    if (!argsArray[argIndex]) { // check if user or role is given
                        message.channel.send('Please enter a user or role.');
                        Bot.mStats.logMessageSend();
                        return false;
                    }

                    // load either user or role
                    var role = stringToRole(message.guild, argsArray[argIndex], true, false);
                    if (typeof (role) == 'string') {
                        message.channel.send('You can\'t add everyone or here to a rank.');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    var user: GuildMember;
                    if (!role) {
                        user = await stringToMember(message.guild, argsArray[argIndex], true, true, false);
                        if (!user) {
                            message.channel.send('There isn\'t a role or user called that way');
                            Bot.mStats.logMessageSend();
                            return false;
                        }
                    }

                    // either add or remove the role/user
                    if (argsArray[0] == 'add') {
                        if (await Bot.database.addToRank(message.guild.id, 'mods', (role ? role.id : undefined), (user ? user.id : undefined))) {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`Successfully added ${role ? role.name : user.toString()} to mods`);
                            // log the staff change
                            Bot.logger.logStaff(message.guild, message.member, logTypes.add, 'mods', role, (user ? user.user : undefined));
                        } else {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`${role ? role.name : user.toString()} is already a mod`);
                        }
                        Bot.mStats.logCommandUsage(command.name, 'add');
                    } else {
                        if (await Bot.database.removeFromRank(message.guild.id, 'mods', (role ? role.id : undefined), (user ? user.id : undefined))) {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`Successfully removed ${role ? role.name : user.toString()} from mods`);
                            // log the staff change
                            Bot.logger.logStaff(message.guild, message.member, logTypes.remove, 'mods', role, (user ? user.user : undefined));
                        } else {
                            Bot.mStats.logResponseTime(command.name, requestTime);
                            message.channel.send(`${role ? role.name : user.toString()} isn't in rank mods`);
                        }
                        Bot.mStats.logCommandUsage(command.name, 'remove');
                    }
                    Bot.mStats.logMessageSend();
                    break;
                case 'list':
                    // get staff document of the guild
                    var staffDoc = await Bot.database.findStaffDoc(message.guild.id);

                    // load list into strings
                    var roles = 'No Roles';
                    var users = 'No Users';
                    if (staffDoc) {
                        var staffObject: staffObject = staffDoc.toObject();
                        if (staffObject.mods.roles.length > 0) { // add roles to list
                            roles = '';
                            for (const roleID of staffObject.mods.roles) {
                                var roleObject = message.guild.roles.get(roleID);
                                roles += roleObject.toString() + '\n';
                            }
                        }
                        if (staffObject.mods.users.length > 0) { // add users to list
                            users = '';
                            for (const roleID of staffObject.mods.users) {
                                var user = message.guild.members.get(roleID);
                                users += user.toString() + '\n';
                            }
                        }
                    }

                    // send embed
                    Bot.mStats.logResponseTime(command.name, requestTime);
                    message.channel.send({
                        'embed': {
                            'color': Bot.database.settingsDB.cache.embedColors.default,
                            'timestamp': new Date().toISOString(),
                            'author': {
                                'name': 'Mods:',
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
                    // if action doesn't exist
                    message.channel.send('Unkown action. Use list, add or rem');
                    Bot.mStats.logMessageSend();
                    break;
            }
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
        }
    }
};

export default command;