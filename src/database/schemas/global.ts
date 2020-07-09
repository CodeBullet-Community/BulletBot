import { Document, SchemaDefinition, Schema } from "mongoose";
import { CommandName } from "../../commands/command";

/**
 * A document that extends on a specific Object
 */
export type ExDocument<T> = T & Document;

/**
 * Defines the limits in using a specific command
 */
export interface CommandUsageLimits {
    globalCooldown?: number;
    localCooldown?: number;
    enabled?: boolean;
}

/**
 * Defines limits in the usage of the bot
 */
export interface UsageLimits {
    commands?: {
        [K in CommandName]: CommandUsageLimits;
    };
    cases?: {
        maxCases?: number;
        storeTime?: number;
    };
    webhooks?: {
        maxWebhooks?: number;
        maxMessageLength?: number;
    };
    pActions?: {
        maxTime?: number;
    };
    megalog?: {
        disabled?: [string];
    };
    logs?: {
        maxLogs?: number;
        storeTime?: number;
    };
    guild?: {
        maxInactiveTime?: number;
    };
}
/** 
 * Schema definition for usage limits
 */
export const usageLimitSchemaDefinition: SchemaDefinition = {
    commands: { required: false, type: Schema.Types.Mixed },
    cases: {
        required: false,
        type: {
            maxCases: { required: false, type: Number },
            storeTime: { required: false, type: Number }
        }
    },
    webhooks: {
        required: false,
        type: {
            maxWebhooks: { required: false, type: Number },
            maxMessageLength: { required: false, type: Number }
        }
    },
    pActions: {
        required: false,
        type: {
            maxTime: { required: false, type: Number }
        }
    },
    megalog: {
        required: false,
        type: {
            disabled: { required: false, type: [String] }
        }
    },
    logs: {
        required: false,
        type: {
            maxLogs: { required: false, type: Number },
            storeTime: { required: false, type: Number }
        }
    },
    guild: {
        required: false,
        type: {
            maxInactiveTime: { required: false, type: Number }
        }
    }
}