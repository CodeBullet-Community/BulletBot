import {Bot} from "."
/*FILTER_ACTION is an object with Symbols in it representing enum values
	for the actions a filter can take note: Symbol("nothing")!== FILTER_ACTION.NOTHING 
	but FILTER_ACTION.nothing === FILTER_ACTION.nothing which is why symbols were used
	for this purpose whether or not that's neccesary is debatable*/
export const FILTER_ACTION = {
	nothing:Symbol("nothing"),//use to indicate a filter did nothing in discord
	delete:Symbol("delete"),//use to indicate a filter deleted at least 1 message
	send:Symbol("send")//use to indicate a filter 
};
//interface an object needs to implement to be used as a filter
export interface filter {
	name: string,//idk why this is neccesary but the old filter had it
	shouldRun:Promise<boolean>,//returns a promise which computes to whether the filter should run
	action:(bot:Bot)=>Promise<completion>,//
	shortHelp:string,//used by the help command to describe the filter
	embededHelp:any,//used by the help command to describe the filter in detail

}
export interface completion {//a type that contains the actions that were taken with arbituary details
	actions:Set<symbol>,//should be a symbol from the FILTER_ACTION object which indicate what actions the bot took
	details:any//contains the details of the completion of the filter note: a specific type should probably be used for this rather than any
}
export default class Filters {
	
}