import { ChannelResolvable, DMChannel, TextChannel, User } from 'discord.js';
import { keys } from 'ts-transformer-keys';

import { Bot } from '../..';
import { commandInterface, CommandResolvable } from '../../commands';
import { PermLevel } from '../../utils/permissions';
import { resolveChannel, resolveCommand } from '../../utils/resolvers';
import { Wrapper } from './wrapper';
import { CommandCacheObject, CommandCache } from '../schemas/main/commandCache';

/**
 * Only returns TextChannels or DMChannels
 *
 * @param {ChannelResolvable} channel Channel to get and check
 * @returns TextChannel or DMChannel
 */
function getTextBasedChannel(channel: ChannelResolvable) {
    let channelObj = resolveChannel(channel);
    if (!(channelObj instanceof TextChannel || channelObj instanceof DMChannel)) return undefined;
    return channelObj;
}

/**
 * Wrapper for the CommandCache object and document so everything can easily be access through one object
 *
 * @export
 * @class CommandCache
 * @implements {commandCacheObject}
 */
export class CommandCacheWrapper extends Wrapper<CommandCacheObject> implements CommandCache {
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

    /**
     * Creates an instance of CommandCacheWrapper with basic values to identify the CommandCache.
     * To create a new CommandCache use init() afterwards.
     * 
     * @param {ChannelResolvable} channel
     * @param {User} user
     * @memberof CommandCacheWrapper
     */
    constructor(channel: ChannelResolvable, user: User) {
        let channelObj = getTextBasedChannel(channel);
        if (!channelObj)
            throw new Error('Invalid channel type was provided. CommandCache channels can only be of type TextChannel or DMChannel.');

        super(Bot.database.mainDB.commandCache, { channel: channelObj.id, user: user.id }, ['channel', 'user'], keys<CommandCacheObject>());
        let tempData = this.cloneData();
        tempData.channel = channelObj.id;
        tempData.user = user.id;
        this.data.next(tempData);

        this.subToData(data => this._channel = getTextBasedChannel(data.channel), 'channel');
        this.subToData(async data => this._user = await Bot.client.fetchUser(data.user), 'user');
        this.subToData(data => this._command = Bot.commands.get(data.command), 'command');
        this.subToData(data => this._expirationDate = new Date(data.expirationTimestamp), 'expirationTimestamp');

        this.setCustomProperty('channel', () => this._channel);
        this.setCustomProperty('user', () => this._user);
        this.setCustomProperty('command', () => this._command);
        this.setCustomProperty('expirationDate', () => this._expirationDate);
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
        let commandObj = resolveCommand(command);
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