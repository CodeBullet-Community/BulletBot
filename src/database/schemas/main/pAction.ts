import { Schema } from 'mongoose';

import { ExDocument } from '../global';
import { Snowflake } from 'discord.js';
import { WebhookService } from './guild';

/**
 * Actions possible by the PAction module
 */
export enum PActionAction {
    Unmute = 0,
    UnlockChannel = 1,
    Unban = 2,
    ResubWebhook = 3
}

/**
 * A raw PAction object from the database
 */
export interface PActionObject {
    from: number;
    to: number;
    action: PActionAction;
    info: PActionMuteInfo | PActionBanInfo | PActionLockChannelInfo | PActionResubWebhookInfo;
};
/**
 * Mongoose Document for PActionObject
 */
export type PActionDoc = ExDocument<PActionObject>;
/**
 * Schema for PActionObject
 */
export const pActionSchema = new Schema({
    from: Number,
    to: Number,
    action: Number,
    info: Schema.Types.Mixed
}, { collection: 'pActions' });

/**
 * PAction info for a unmute of a GuildMember
 */
export interface PActionMuteInfo {
    guild: Snowflake;
    user: Snowflake;
    case: number;
}
/**
 * PAction for a unmute of a GuildMember
 */
export interface PActionMuteObject extends PActionObject {
    info: PActionMuteInfo;
}

/**
 * PAction info for a unban of a User
 */
export interface PActionBanInfo {
    guild: Snowflake;
    user: Snowflake;
    case: number;
}
/**
 * PAction for a unban of a User
 */
export interface PActionBanObject extends PActionObject {
    info: PActionBanInfo;
}

/**
 * PAction info for a unlock of a TextChannel
 */
export interface PActionLockChannelInfo {
    guild: Snowflake;
    channel: Snowflake;
    allowOverwrites: Snowflake[];
    neutralOverwrites: Snowflake[];
}
/**
 * PAction for a unlock of a TextChannel
 */
export interface PActionLockChannelObject {
    info: PActionLockChannelInfo;
}

/**
 * PAction info for resubscribing to all webhooks of a service
 */
export interface PActionResubWebhookInfo {
    service: WebhookService;
}
/**
 * PAction for resubscribing to all webhooks of a service
 */
export interface PActionResubWebhookObject {
    info: PActionResubWebhookInfo;
}