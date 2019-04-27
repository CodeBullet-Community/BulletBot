import { Message } from 'discord.js';
import { Bot } from '..';

export enum filterActions { nothing, delete, send };

/**
 * Definition of a filter action object that the filter will output if it request a action.
 *
 * @export
 * @interface filterAction
 */
export interface filterAction {
    /**
     * specifies the type of action
     *
     * @type {filterActions}
     * @memberof filterAction
     */
    type: filterActions;
    /**
     * parameter for the delete action, which specifies how many ms it should wait before deletion
     *
     * @type {number}
     * @memberof filterAction
     */
    delay?: number;
    /**
     * parameter for the send action, which specifies the message
     *
     * @type {*}
     * @memberof filterAction
     */
    message?: any;
};

/**
 * executes single filter action
 *
 * @export
 * @param {Message} message message to execute actions on
 * @param {filterAction} action action to execute
 * @returns
 */
export async function executeAction(message: Message, action: filterAction) {
    try {
        switch (action.type) {
            case filterActions.nothing:
                return true;
            case filterActions.delete:
                await message.delete(action.delay);
                return true;
            case filterActions.send:
                await message.reply(action.message);
                Bot.mStats.logMessageSend();
                return true;
            default:
                console.warn('unknown action:' + action);
                Bot.mStats.logError(new Error('unknown action:' + action));
                return false;
        }
    } catch (e) {
        Bot.mStats.logError(e);
        return false;
    }
}

/**
 * executes array of filter actions using executeAction
 *
 * @export
 * @param {Message} message message to execute actions on
 * @param {filterAction[]} actions actions to execute
 */
export function executeActions(message: Message, actions: filterAction[]) {
    for (var i = 0; i < actions.length; i++) {
        executeAction(message, actions[i]);
    }
}