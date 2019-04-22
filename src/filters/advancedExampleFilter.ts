import {Filters, filter as filterInterface, filterOutput } from "../filters";
import { Bot } from "..";
import { Message, Guild,User } from "discord.js";
import {filter} from "../filters";
import {FILTER_ACTION,filterAction} from "../utils/filters";
/*
	Most filters can generally follow the simple example(with some tweaks like actually referencing the database)
	but some filters should do something more like use the cache to store previous messages or use
	the cache to store a start time for a duration in which the filter shouldn't be active again or something
	other advanced features can be done too but most of that involves commands or working with the
	Message Discord.js api
*/
class cacheData {//we don't need a cacheData object for the cache it can be any datatype but in this case given that we are keeping track of more than 1 variable of different types an object is useful
	constructor(public num:Number, public user:User){}
}
let filter:filter = {
/*lets make a counting filter(if someone says 0 the bot will start a counting game where each 
person is supposed to say the previous number +1) we'll be using the cache for both the counting
and use it with the Message api to make sure someone can't say a bunch of numbers to get a 
really high count*/
	name:"counting game",
	path:'',
	active:(guild:Guild):Promise<boolean>=>{
		return Promise.resolve(true);//same thing as the simple example and we're still not using the database because this is an example(also I don't know how to use it and I'm being stubborn right now)
	},
	shortHelp:"Allows for the beginning and playing of a simple counting game",
	embedHelp:null,//TODO: add an embed help
	run:(message:Message):Promise<filterOutput>=>{
		let output:filterOutput = {report:null,actions:new Array<filterAction>()};
		if(message.author.bot){//do nothing when the user is a bot
			output.report = "user sending the message is a bot ignoring";
			output.actions.push({type:FILTER_ACTION.nothing});
		}
		else if(message.content.indexOf((this.cache.num-1).toString())===0){
			if(this.cache===-1){
				output.actions.push({type:FILTER_ACTION.send,message:"Game Started by "+message.author.username})
				this.cache = new cacheData(0,message.author);
			}
			this.cache = new cacheData(this.cache.num+1,message.author);
		}
		else if(this.cache===-1){
			output.actions.push({type:FILTER_ACTION.nothing});
		}
		else{
			output.actions.push({type:FILTER_ACTION.send,message:"Game over "+message.author.username+" messed it up resetting if you wish to start a new game say 0"});
			this.cache = new cacheData(-1,null);
		}
		return Promise.resolve(output);
	},
	cache:new cacheData(-1,null),
};

export default filter;