import {Message} from 'discord.js';
import {MEMBER} from "../utils/permissions";
import {permToString} from "../utils/parsers";
import {Bot} from '..';
import {commandInterface} from '../commands';
let command:commandInterface = {
	name:"whois",
	path:"",
	dm:false,
	permLevel:MEMBER,
	togglable:false,
	shortHelp:"gives a description of a user",
	embedHelp:async ():Promise<any>=>{
		let prefix = await Bot.database.getPrefix();
		let color = Bot.database.settingsDB.cache.helpEmbedColor
		return {
			'embed':{
				'color':color,
				'author':{
					name:'Command: '+ prefix + 'whois'
				},
				fields: [
					{
	                    'name': 'Description:',
	                    'value': 'let\'s you '
	                },
	                {
	                    'name': 'Need to be:',
	                    'value': permToString(MEMBER),
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
	                    'value': `${prefix}${command.name}`
	                },
	                {
	                    'name': 'Example:',
	                    'value': `${prefix}${command.name} BulletBot`
	                }
				]
			}
		};
	},
	run:(message:Message,args:string,permLevel:number,dm:boolean,requestTimeStamp:number):Promise<void>=>{
		/*
			Note for whoever tries to implement this is that the following should be correct behavior
			1) if a mention of a user is provided after the command that user should be the one that is gotten
			2) if an exact name of a user is provided that is the user that should be gotten
			3)if the id of a user is provided that is the user that should be gotten
			4) if a name that doesn't exactly match any user is used then the user with the closest name should be chosen
			5) if no info is provided it should whois the caller
		*/
	}
};