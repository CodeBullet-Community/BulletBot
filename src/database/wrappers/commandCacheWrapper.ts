import { DMChannel, GroupDMChannel, TextChannel, User, UserResolvable, ChannelResolvable } from "discord.js";
import { CommandCacheDoc, CommandCache, CommandCacheObject } from "../schemas";
import { commandInterface, CommandResolvable } from "../../commands";
import { resolveCommand, resolveChannel, resolveUser } from "../../utils/resolvers";
import { Wrapper } from "./wrapper";
import { Bot } from "../..";
import { keys } from "ts-transformer-keys";
import { PermLevel } from "../../utils/permissions";

/**
 * Wrapper for the CommandCache object and document so everything can easily be access through one object
 *
 * @export
 * @class CommandCache
 * @implements {commandCacheObject}
 */
export class CommandCacheWrapper extends Wrapper<CommandCacheObject> implements CommandCache {
    private channelObj: DMChannel | TextChannel;
    readonly channel: DMChannel | TextChannel;
    private userObj: User;
    readonly user: User;
    readonly command: commandInterface;
    readonly permLevel: number;
    readonly cache: any;
    readonly expirationTimestamp: number;
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
        let channelObj = resolveChannel(channel);
        if (!(channelObj instanceof TextChannel || channelObj instanceof DMChannel))
            throw new Error('Invalid channel type was provided. CommandCache channels can only be of type TextChannel or DMChannel.');

        super(Bot.database.mainDB.commandCache, { channel: channelObj.id, user: user.id }, ['channel', 'user'], keys<CommandCacheObject>());

        this.channelObj = channelObj;
        this.userObj = user;

        this.setCustomProperty('channel', () => this.channelObj);
        this.setCustomProperty('user', () => this.userObj);
        this.setCustomProperty('command', () => Bot.commands.get(this.data.command));
        this.setCustomProperty('expirationDate', () => new Date(this.data.expirationTimestamp));
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

        this.data.command = commandObj.name;
        this.data.permLevel = permLevel;
        this.data.cache = cache;
        this.data.expirationTimestamp = expirationTimestamp;
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
        this.data.cache = cache;
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
        this.data.expirationTimestamp = expirationTimestamp;
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