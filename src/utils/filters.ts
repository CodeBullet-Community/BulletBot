import { Message } from "discord.js";
import { Bot } from "..";

export const FILTER_ACTION = {
    send:Symbol("send"),
    delete:Symbol("delete"),
    nothing:Symbol("nothing")

}

export interface filterAction {
    type: symbol;
    delay?: number;
    message?: any;
};

/**
 * executes single filter action
 *
 * @export
 * @param {Message} message
 * @param {filterAction} action
 * @returns
 */
export async function executeAction(message: Message, action: filterAction) {
    try {
        switch (action.type) {
            case FILTER_ACTION.nothing:
                return true;
            case FILTER_ACTION.delete:
                await message.delete(action.delay);
                return true;
            case FILTER_ACTION.send:
                await message.reply(action.message);
                return true;
            default:
                console.warn("unknown action:" + action);
                Bot.mStats.logError();
                return false;
        }
    } catch (e) {
        Bot.mStats.logError();
        return false;
    }
}

/**
 * executes array of filter actions using executeAction
 *
 * @export
 * @param {Message} message
 * @param {filterAction[]} actions
 */
export function executeActions(message: Message, actions: filterAction[]) {
    for (var i = 0; i < actions.length; i++) {
        executeAction(message, actions[i]);
    }
}