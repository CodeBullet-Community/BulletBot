import { Message, RichEmbed, Guild } from 'discord.js';
import { commandInterface } from '../commands';
import { MEMBER } from '../utils/permissions';
import { Bot } from '..';
import { sendError } from '../utils/messages';
import { permToString } from '../utils/parsers';

var command: commandInterface = { name: undefined, path: undefined, dm: undefined, permLevel: undefined, togglable: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };


command.run = async (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => {
    /*
			Note for whoever tries to implement this is that the following should be correct behavior
			1) if a mention of a user is provided after the command that user should be the one that is gotten
			2) if an exact name of a user is provided that is the user that should be gotten
			3)if the id of a user is provided that is the user that should be gotten
			4) if a name that doesn't exactly match any user is used then the user with the closest name should be chosen
			5) if no info is provided it should whois the caller
	*/
	//A lot of methods used below don't exist yet and need to implemented
    try {
        if(args.length === 0){
        	message.reply(Bot.database.fetchUserInfo(message.author).toEmbed());
        	return;
        }
        if(RegExp('<@([0-9])+>').test(args[0])){//will look for a string that has <@(some numbers)>
        	
        }
    } catch (e) {
        sendError(message.channel, e);
        Bot.mStats.logError();
    }
}

command.name = 'whois';
command.path = '';
command.dm = true;
command.permLevel = MEMBER;
command.togglable = false;
command.shortHelp = 'gives a description of a user';
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
                    'value': 'gives a description of a user'
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
                    'value': `${prefix+command.name}\n${prefix+command.name} [member]`
                },
                {
                    'name': 'Example:',
                    'value':`${prefix+command.name}\n${prefix+command.name} @Bullet Bot`
                }
            ]
        }
    }
};

export default command;