import { DMChannel, GroupDMChannel, TextChannel, User } from "discord.js";
import { CommandCacheDoc } from "./schemas";
import { commandInterface } from "../commands";
import { resolveCommand } from "../utils/resolvers";

/**
 * Wrapper from command cache. Is a mix between doc and object
 *
 * @export
 * @class CommandCache
 * @implements {commandCacheObject}
 */
export class CommandCache {
    /**
     * Channel where the command cache is valid
     *
     * @type {(DMChannel | GroupDMChannel | TextChannel)}
     * @memberof CommandCache
     */
    channel: DMChannel | GroupDMChannel | TextChannel;
    /**
     * User for which the command cache exists
     *
     * @type {User}
     * @memberof CommandCache
     */
    user: User;
    /**
     * Command for which the command cache is
     *
     * @type {commandInterface}
     * @memberof CommandCache
     */
    command: commandInterface;
    /**
     * The cache set by the command
     *
     * @type {*}
     * @memberof CommandCache
     */
    cache: any;
    /**
     * When the command cache will expire
     *
     * @type {number}
     * @memberof CommandCache
     */
    delete: number;
    /**
     * Document from the database storing the command cache
     *
     * @type {CommandCacheDoc}
     * @memberof CommandCache
     */
    doc: CommandCacheDoc;
    /**
     * Creates an instance of CommandCache with an existing command cache.
     * @param {CommandCacheDoc} commandCacheDoc Existing command cache
     * @param {User} user The user for the command cache
     * @param {(DMChannel | GroupDMChannel | TextChannel)} [channel] The channel of the command cache
     * @memberof CommandCache
     */
    constructor(commandCacheDoc: CommandCacheDoc, user: User, channel: DMChannel | GroupDMChannel | TextChannel) {
        this.doc = commandCacheDoc;
        this.user = user;
        this.channel = channel;
        this.command = resolveCommand(commandCacheDoc.command);
        this.cache = commandCacheDoc.cache;
        this.delete = commandCacheDoc.delete;
    }

    /**
     * saves cache to new 
     *
     * @param {number} [newCacheTime] if set, will reset the delete timestamp to a new date
     * @returns
     * @memberof CommandCache
     */
    save(newCacheTime?: number) {
        this.doc.cache = this.cache;
        this.doc.markModified('cache');
        if (newCacheTime)
            this.doc.delete = Date.now() + newCacheTime;
        return this.doc.save()
    }

    /**
     * deletes doc from database
     *
     * @returns
     * @memberof CommandCache
     */
    remove() {
        return this.doc.remove()
    }

    /**
     * If the command cache isn't expired yet
     *
     * @returns
     * @memberof CommandCache
     */
    isValid() {
        return Date.now() > this.delete;
    }

}