import { Filters,  filterInterface, filterOutput } from "../filters";
import { Message, Guild } from "discord.js";
import { filterActions, filterAction } from "../utils/filters";
import { Bot } from "..";

let filter: filterInterface = { name: undefined, path: undefined, shortHelp: undefined, embedHelp: undefined, run: undefined };// note this is not an example for creating a filter based from a path rather making a filter in the source code
filter.name = "kappa";// the name of the filter goes here
filter.path = '';// the path too the file the filter was gotten from assuming it was gotten from a file
filter.shortHelp = "replies with kappa and deletes it messages with kappa";
filter.embedHelp = async (guild: Guild) => {
	return {
		"embed": {
			"color": Bot.database.settingsDB.cache.helpEmbedColor,
			"author": {
				"name": "Filter: " + filter.name
			},
			"fields": [
				{
					"name": "Description:",
					"value": "This filter will just reply kappa to everything and delete any message which contains kappa"
				}
			]
		}
	};
};
filter.run = (message: Message): Promise<filterOutput> => {
	let actions: Array<filterAction> = new Array();
	let unconditionalAction: filterAction = {
		type: filterActions.send,// sets the type of the message so it is sent
		message: "kappa"
	};
	actions[0] = unconditionalAction;
	let conditionalAction: filterAction = {
		type: filterActions.delete,
		delay: 1000,
	}
	if (message.content.includes("kappa")) {// the filter action of deleting them message isn't added unless it contains kappa because honestly we only delete messages that include kappa(saying kappa is our thing)
		actions.push(conditionalAction);
	}
	let output: filterOutput = {
		reason: "as you wish master",// the report of the filter idk what this should contain but we'll just keep it as as you wish master
		actions: actions
	};
	return Promise.resolve(output);// unless your filterOutput relies on unreliable things this is how it should be returned
};
export default filter;// used to export the filter from the module