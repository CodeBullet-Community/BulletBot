import { Message } from "discord.js";
import { filter } from "../filters";
import { bot } from "..";

export const ACTION_NOTHING = 0;
export const ACTION_DELETE = 1;
export const ACTION_SEND = 2;

export interface filterAction {
    type: number;
    delay?: number;
    message?: any;
};

/** executes single filter action */
export function executeAction(message: Message, action: filterAction) {
    switch (action.type) {
        case ACTION_NOTHING:
            break;
        case ACTION_DELETE:
            message.delete(action.delay);
            break;
        case ACTION_SEND:
            message.reply(action.message);
            break;
        default:
            console.warn("unknown action:" + action);
            break;
    }
}


/** executes array of filter actions using executeAction */
export function executeActions(message: Message, actions: filterAction[]) {
    for (var i = 0; i < actions.length; i++) {
        executeAction(message, actions[i]);
    }
}

/** converts filter action into words */
export function actionToString(action: filterAction) {
    switch (action.type) {
        case ACTION_NOTHING:
            return "nothing";
        case ACTION_DELETE:
            if (action.delay == 0) {
                return "deleted message";
            }
            return `deleted message after ${action.delay}ms`;
        case ACTION_SEND:
            return `replied with "${action.message}" to message`;
        default:
            console.warn("actionToString: unknown action");
            return "unknown action";
    }
}

export function createFilterReport(bot:bot,message:Message,filter:filter, reason:string,actions:filterAction[]){
    var actionsString = actionToString(actions[0]);
    var deleted = false;
    if(actions[0].type == ACTION_DELETE) deleted = true;
    for(var i = 1; i < actions.length; i++){
        if(actions[i].type == ACTION_DELETE) deleted = true;
        actionsString += "\n"+actionToString(actions[i]);
    }
    var content = message.content;
    if(!deleted){
        content = `[Jump to Message](${message.url})\n`+content;
    }

    return {
        "embed": {
            "description": filter.shortHelp,
            "color": bot.database.getGlobalSettings().defaultEmbedColor,
            "timestamp": message.createdAt,
            "author": {
                "name": "Filter: " + filter.name,
                "icon_url": bot.client.user.avatarURL
            },
            "fields": [
                {
                    "name": "From:",
                    "value": message.author.toString() + " (" + message.author.id + ")",
                    "inline": true
                },
                {
                    "name": "Reason:",
                    "value": reason,
                    "inline": true
                },
                {
                    "name": "Message:",
                    "value": content
                },
                {
                    "name": "Actions",
                    "value": actionsString
                }
            ]
        }
    };
}