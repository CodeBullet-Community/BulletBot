import { Schema } from 'mongoose';

import { CommandName } from '../../../commands/command';
import { MegalogFunction, WebhookService } from '../main/guild';

/**
 * Raw mStats base object used in all three collections
 */
export interface MStatsObject {
    messagesReceived: number; // all messages received
    messagesSend: number; // all messages send
    logs: number; // total logs created
    guildsJoined: number;
    guildsLeft: number;
    guildsTotal: number;
    errorsTotal: number;
    bugs: number; // total bugs reported
    botSuggestions: number; // total bot suggestions made
    commandTotal: number; // total used
    commands: {
        // key is command name, usage data
        [K in CommandName]: {
            _errors: number; // total errors caught
            _resp: number; // response time in ms (when first replay send, so ping doesn't get counted)
            _main?: number; // main command
            // subcommand like add, rem, list
            [key: string]: number;
        }
    };
    webhooks: {
        // key is service name
        [K in WebhookService]?: {
            total: number; // how many exist
            created: number;
            changed: number;
            deleted: number;
        }
    };
    ping: {
        clientAPI: number; // client ping
        cluster: number;
    };
    megalog: {
        enabled: {
            [K in MegalogFunction]: number;
        };
        logged: {
            [K in MegalogFunction]: number;
        };
    };
}

/**
 * Creates a MStatsObject with default zero values
 *
 * @export
 * @returns {MStatsObject} MStatsObject with default zero values
 */
export function createEmptyMStatsObject(): MStatsObject {
    return {
        messagesReceived: 0,
        messagesSend: 0,
        logs: 0,
        guildsJoined: 0,
        guildsLeft: 0,
        guildsTotal: 0,
        errorsTotal: 0,
        bugs: 0,
        botSuggestions: 0,
        commandTotal: 0,
        commands: {},
        webhooks: {},
        ping: {
            clientAPI: 0,
            cluster: 0
        },
        megalog: {
            enabled: {
                channelCreate: 0,
                channelDelete: 0,
                channelUpdate: 0,
                ban: 0,
                unban: 0,
                memberJoin: 0,
                memberLeave: 0,
                nicknameChange: 0,
                memberRolesChange: 0,
                guildNameChange: 0,
                messageDelete: 0,
                attachmentCache: 0,
                messageEdit: 0,
                reactionAdd: 0,
                reactionRemove: 0,
                roleCreate: 0,
                roleDelete: 0,
                roleUpdate: 0,
                voiceTransfer: 0,
                voiceMute: 0,
                voiceDeaf: 0
            },
            logged: {
                channelCreate: 0,
                channelDelete: 0,
                channelUpdate: 0,
                ban: 0,
                unban: 0,
                memberJoin: 0,
                memberLeave: 0,
                nicknameChange: 0,
                memberRolesChange: 0,
                guildNameChange: 0,
                messageDelete: 0,
                attachmentCache: 0,
                messageEdit: 0,
                reactionAdd: 0,
                reactionRemove: 0,
                roleCreate: 0,
                roleDelete: 0,
                roleUpdate: 0,
                voiceTransfer: 0,
                voiceMute: 0,
                voiceDeaf: 0
            }
        }
    };
}

/**
 * Base Schema for MStatsObject
 */
export const mStatsSchemaDefinition = {
    messagesReceived: Number,
    messagesSend: Number,
    logs: Number,
    guildsJoined: Number,
    guildsLeft: Number,
    guildsTotal: Number,
    errorsTotal: Number,
    bugs: Number,
    botSuggestions: Number,
    commandTotal: Number,
    commands: Schema.Types.Mixed,
    webhooks: Schema.Types.Mixed,
    ping: {
        clientAPI: Number,
        cluster: Number
    },
    megalog: {
        enabled: {
            channelCreate: Number,
            channelDelete: Number,
            channelUpdate: Number,
            ban: Number,
            unban: Number,
            memberJoin: Number,
            memberLeave: Number,
            nicknameChange: Number,
            memberRolesChange: Number,
            guildNameChange: Number,
            messageDelete: Number,
            attachmentCache: Number,
            messageEdit: Number,
            reactionAdd: Number,
            reactionRemove: Number,
            roleCreate: Number,
            roleDelete: Number,
            roleUpdate: Number,
            voiceTransfer: Number,
            voiceMute: Number,
            voiceDeaf: Number
        },
        logged: {
            channelCreate: Number,
            channelDelete: Number,
            channelUpdate: Number,
            ban: Number,
            unban: Number,
            memberJoin: Number,
            memberLeave: Number,
            nicknameChange: Number,
            memberRolesChange: Number,
            guildNameChange: Number,
            messageDelete: Number,
            attachmentCache: Number,
            messageEdit: Number,
            reactionAdd: Number,
            reactionRemove: Number,
            roleCreate: Number,
            roleDelete: Number,
            roleUpdate: Number,
            voiceTransfer: Number,
            voiceMute: Number,
            voiceDeaf: Number
        }
    }
};