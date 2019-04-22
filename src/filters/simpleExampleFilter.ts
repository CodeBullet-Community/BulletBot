import Filters, { filter as filterInterface, filterOutput } from "../filters";
import { Bot } from "..";
import { Message, Guild } from "discord.js";
import {filter} from "../filters";
import {FILTER_ACTION,filterAction} from "../utils/filters";
let filter:filterInterface = {//note this is not an example for creating a filter based from a path rather making a filter in the source code
	name:null,//the name of the filter goes here
	path:null,//the path too the file the filter was gotten from assuming it was gotten from a file
	active:(bot: Bot, guild: Guild):Promise<boolean>=>{
		return Promise.resolve(true);//we'll just have the filter run no matter what
	},
	shortHelp: "This filter will just reply kappa to everything and delete any message which contains kappa",
	embedHelp: null,//I don't know how embeded messages work so reference some other example for that
	run:(bot:Bot,message:Message):Promise<filterOutput>=>{
		let actions:Array<filterAction> = new Array();
		let unconditionalAction:filterAction = {
			type:FILTER_ACTION.send,//sets the type of the message so it is sent
			message:"kappa"
		};
		actions[0] = unconditionalAction;
		let conditionalAction:filterAction =  {
			type:FILTER_ACTION.delete,
			delay:1000,

		}
		if(message.content.indexOf("kappa")!==-1){//the filter action of deleting them message isn't added unless it contains kappa because honestly we only delete messages that include kappa(saying kappa is our thing)
			actions.push(conditionalAction);
		}
		let output:filterOutput = {
			report:"as you wish master",//the report of the filter idk what this should contain but we'll just keep it as as you wish master
			actions:actions
		};
		return Promise.resolve(output);//unless your filterOutput relies on unreliable things this is how it should be returned
	},
	cache:null//technically we don't need this line(as the cache field is optional in a filter) however I'm including it just so people looking at this example know the cache exists and can be used(an example of it's use is in advancedExampleFilter)
};