import { ChannelResolvable, Client, DMChannel, TextChannel, User } from 'discord.js';
import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';
import { container } from 'tsyringe';

import { Command, CommandResolvable } from '../../../commands/command';
import { CommandModule } from '../../../commands/commandModule';
import { PermLevel } from '../../../utils/permissions';
import { CommandCache, CommandCacheDoc, CommandCacheObject } from '../../schemas/main/commandCache';
import { DocWrapper } from '../docWrapper';
import { UserWrapper } from './userWrapper';

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
    readonly user: UserWrapper;
    private _command: Command;
    readonly command: Command;
    readonly permLevel: number;
    readonly cache: any;
    readonly expirationTimestamp: number;
    /**
     * When this cache expires as a data object
     *
     * @type {Date}
     * @memberof CommandCacheWrapper
     */
    readonly expirationDate: Date;

    private readonly client: Client;
    private readonly commandModule: CommandModule;

    /**
     * Creates an instance of CommandCacheWrapper with basic values to identify the CommandCache.
     * To create a new CommandCache use init() afterwards.
     * 
     * @param {ChannelResolvable} channel
     * @param {User} user
     * @memberof CommandCacheWrapper
     */
    constructor(model: Model<CommandCacheDoc>, channel: DMChannel | TextChannel, user: UserWrapper) {
        super(model, { channel: channel.id, user: user.id }, keys<CommandCacheObject>());
        this.setDataGetters(['channel', 'user', 'command']);

        this.user = user;
        this.client = container.resolve(Client);
        this.commandModule = container.resolve(CommandModule);

        this.subToMappedProperty('channel').subscribe(channel => this._channel = <any>this.client.channels.resolve(channel));
        this.subToMappedProperty('command').subscribe(command => this._command = this.commandModule.get(command));

        this.setWrapperProperty('channel', () => this._channel);
        this.setWrapperProperty('command', () => this._command);
        this.setWrapperProperty('expirationDate', () => new Date(this.expirationTimestamp));
    }

    /**
     * Initializes the CommandCache with the provided values
     *
     * @param {CommandResolvable} command Command for the cache
     * @param {PermLevel} permLevel What permissions level this CommandCache executes with
     * @param {object} cache Object that should be cached
     * @param {number} expirationTimestamp When cache expires
     * @memberof CommandCacheWrapper
     */
    async init(command: CommandResolvable, permLevel: PermLevel, cache: object, expirationTimestamp: number) {
        let commandObj = this.commandModule.resolve(command);

        let result = await this.createDoc({
            channel: this.channel.id,
            user: this.user.id,
            command: commandObj.name,
            permLevel: permLevel,
            cache: cache,
            expirationTimestamp: expirationTimestamp
        }, true);
        if (!result)
            throw new Error('CommandCache initialization failed');
    }

    /**
     * Sets the cache for the CommandCache
     *
     * @param {*} cache Cache to set it to
     * @memberof CommandCacheWrapper
     */
    async setCache(cache: any) {
        await this.update({ $set: { cache: cache } });
        let tempData = this.cloneData();
        tempData.cache = cache;
        this.data.next(tempData);
    }

    /**
     * Extends or shortens the expiration timestamp by n milliseconds.
     * This operation does not load the "expirationTimestamp" field
     *
     * @param {number} milliseconds Ms to extend or shorten the expiration timestamp
     * @memberof CommandCacheWrapper
     */
    async extendExpirationTimestamp(milliseconds: number) {
        await this.update({ $inc: { expirationTimestamp: milliseconds } });
        if (!this.isLoaded(['expirationTimestamp'])) return;
        let tempData = this.cloneData();
        tempData.expirationTimestamp += milliseconds;
        this.data.next(tempData);
    }

    /**
     * Sets the expiration timestamp for the CommandCache
     *
     * @param {number} expirationTimestamp Timestamp to set it to
     * @memberof CommandCacheWrapper
     */
    async setExpirationTimestamp(expirationTimestamp: number) {
        await this.update({ $set: { expirationTimestamp: expirationTimestamp } });
        let tempData = this.cloneData();
        tempData.expirationTimestamp = expirationTimestamp;
        this.data.next(tempData);
        this.addLoadedFields(['expirationTimestamp']);
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