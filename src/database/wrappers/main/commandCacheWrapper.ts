import { ChannelResolvable, DMChannel, TextChannel, User } from 'discord.js';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { Bot } from '../../..';
import { commandInterface, CommandResolvable } from '../../../commands';
import { PermLevel } from '../../../utils/permissions';
import { CommandCache, CommandCacheDoc, CommandCacheObject } from '../../schemas/main/commandCache';
import { DocWrapper } from '../docWrapper';

/**
 * Wrapper for the CommandCache object and document so everything can easily be access through one object
 *
 * @export
 * @class CommandCache
 * @implements {commandCacheObject}
 */
export class CommandCacheWrapper extends DocWrapper<CommandCacheObject> implements CommandCache {
    private _channel: DMChannel | TextChannel;
    readonly channel: DMChannel | TextChannel;
    private _user: User;
    readonly user: User;
    private _command: commandInterface;
    readonly command: commandInterface;
    readonly permLevel: number;
    readonly cache: any;
    readonly expirationTimestamp: number;
    private _expirationDate: Date;
    readonly expirationDate: Date;
    private readonly bot: Bot;

    /**
     * Creates an instance of CommandCacheWrapper with basic values to identify the CommandCache.
     * To create a new CommandCache use init() afterwards.
     * 
     * @param {ChannelResolvable} channel
     * @param {User} user
     * @memberof CommandCacheWrapper
     */
    constructor(model: Model<CommandCacheDoc>, bot: Bot, channel: ChannelResolvable, user: User) {
        let channelObj = getTextBasedChannel(channel);
        if (!channelObj)
            throw new Error('Invalid channel type was provided. CommandCache channels can only be of type TextChannel or DMChannel.');

        let obj = {
            channel: channelObj.id,
            user: user.id
        };
        super(model, { channel: channelObj.id, user: user.id }, obj, keys<CommandCacheObject>());

        this.bot = bot;

        this.subToMappedProperty('channel').subscribe(channel => this._channel = getTextBasedChannel(channel));
        this.subToMappedProperty('user').subscribe(async user => this._user = await this.bot.client.users.fetch(user));
        this.subToMappedProperty('command').subscribe(command => this._command = this.bot.commands.get(command));
        this.subToMappedProperty('expirationTimestamp').subscribe(timestamp => this._expirationDate = new Date(timestamp));

        this.setWrapperProperty('channel', () => this._channel);
        this.setWrapperProperty('user', () => this._user);
        this.setWrapperProperty('command', () => this._command);
        this.setWrapperProperty('expirationDate', () => this._expirationDate);
    }

    /**
     * Initializes the CommandCache with the provided values
     *
     * @param {CommandResolvable} command Command for the cache
     * @param {PermLevel} permLevel What permissions level this CommandCache executes with
     * @param {object} cache Object that should be cached
     * @param {number} expirationTimestamp When it expires
     * @returns The CommandCacheWrapper if it was successfully created
     * @memberof CommandCacheWrapper
     */
    async init(command: CommandResolvable, permLevel: PermLevel, cache: object, expirationTimestamp: number) {
        let commandObj = this.bot.commands.resolve(command);
        if (!commandObj)
            throw new Error('CommandResolvable failed to resolve to command');

        let result = await this.createDoc({
            channel: this.channel.id,
            user: this.user.id,
            command: commandObj.name,
            permLevel: permLevel,
            cache: cache,
            expirationTimestamp: expirationTimestamp
        }, true);
        if (!result) {
            console.warn('CommandCache initialization failed');
            return undefined;
        }

        return this;
    }

    /**
     * Only returns TextChannels or DMChannels
     *
     * @param {ChannelResolvable} channel Channel to get and check
     * @returns TextChannel or DMChannel
     * @memberof CommandCacheWrapper
     */
    getTextBasedChannel(channel: ChannelResolvable) {
        let channelObj = this.bot.client.channels.resolve(channel);
        if (!(channelObj instanceof TextChannel || channelObj instanceof DMChannel)) return undefined;
        return channelObj;
    }

    /**
     * Sets the cache for the CommandCache
     *
     * @param {*} cache Cache to set it to
     * @returns The provided cache if operation was successful
     * @memberof CommandCacheWrapper
     */
    async setCache(cache: any) {
        let query = { $set: { cache: cache } };
        await this.update(query);
        let tempData = this.cloneData();
        tempData.cache = cache;
        this.data.next(tempData);
        return cache;
    }

    /**
     * Extends the expiration timestamp by n milliseconds.
     *
     * @param {number} milliseconds How many milliseconds to extend the expiration timestamp
     * @returns The extended expiration timestamp if operation was successful
     * @memberof CommandCacheWrapper
     */
    async extendExpirationTimestamp(milliseconds: number) {
        await this.load('expirationTimestamp');
        return await this.setExpirationTimestamp(this.expirationTimestamp + milliseconds);
    }

    /**
     * Sets the expiration timestamp for the CommandCache
     *
     * @param {number} expirationTimestamp Timestamp to set it to
     * @returns The provided timestamp if operation successful
     * @memberof CommandCacheWrapper
     */
    async setExpirationTimestamp(expirationTimestamp: number) {
        let query = { $set: { expirationTimestamp: expirationTimestamp } };
        await this.update(query);
        let tempData = this.cloneData();
        tempData.expirationTimestamp = expirationTimestamp;
        this.data.next(tempData);
        this.updateLoadedFields(['expirationTimestamp']);
        return expirationTimestamp;
    }

    /**
     * If the CommandCache has already expired
     *
     * @returns
     * @memberof CommandCache
     */
    async isExpired() {
        await this.load('expirationTimestamp');
        return Date.now() > this.expirationTimestamp;
    }

}