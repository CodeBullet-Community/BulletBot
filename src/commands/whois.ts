import {Message} from 'discord.js';
import {MEMBER} from "../utils/permissions"
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
		return {
			'embed':{
				'color':Bot.database.settingsDB.cache.helpEmbedColor,
				'author':{
					name:'Command: '+ prefix + 'whois'
				},
				fields: [
					
				]
			}
		};
	},
	run:(message:Message,args:string,permLevel:number,dm:boolean,requestTimeStamp:number):Promise<void>=>{

	}
};