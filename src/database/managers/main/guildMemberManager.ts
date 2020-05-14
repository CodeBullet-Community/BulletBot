import { Client, Guild, GuildMemberResolvable, Snowflake } from 'discord.js';

import { Commands } from '../../../commands';
import { Database } from '../../database';
import { GuildMemberObject, guildMemberSchema } from '../../schemas/main/guildMember';
import { LoadOptions } from '../../wrappers/docWrapper';
import { GuildMemberWrapper } from '../../wrappers/main/guildMemberWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions } from '../collectionManager';
import { GuildManager, GuildWrapperResolvable } from './guildManager';
import { UserManager, UserWrapperResolvable } from './userManager';

/**
 * Types that are resolvable to a GuildMemberWrapper
 */
export type GuildMemberWrapperResolvable = GuildMemberWrapper | GuildMemberResolvable;

/**
 * Holds the guildMember model
 *
 * @export
 * @class GuildMemberManager
 * @extends {CacheManager<GuildMemberObject, GuildMemberWrapper>}
 */
export class GuildMemberManager extends CacheManager<GuildMemberObject, GuildMemberWrapper> {

    private readonly client: Client;
    private readonly userManager: UserManager;
    private readonly guildManager: GuildManager;
    private readonly commandModule: Commands;

    /**
     * Creates an instance of GuildMemberManager.
     * 
     * @param {Database} database Database to get model from
     * @param {Client} client
     * @param {UserManager} userManager
     * @param {GuildManager} guildManager
     * @param {Commands} commandModule
     * @memberof GuildMemberManager
     */
    constructor(database: Database, client: Client, userManager: UserManager, guildManager: GuildManager, commandModule: Commands) {
        super(database, 'main', 'guildMember', guildMemberSchema, GuildMemberWrapper);
        this.client = client;
        this.userManager = userManager;
        this.guildManager = guildManager;
        this.commandModule = commandModule;
    }

    /**
     * Generates a default guildMember object with the provided user id and guild id
     *
     * @param {Snowflake} userId User id
     * @param {Snowflake} guildId Guild id
     * @returns
     * @memberof GuildMemberManager
     */
    getDefaultObject(userId: Snowflake, guildId: Snowflake) {
        return {
            user: userId,
            guild: guildId,
            commandLastUsed: {}
        };
    }

    /**
     * @param {Snowflake} userId User id
     * @param {Snowflake} guildId Guild id
     * @returns
     * @memberof GuildMemberManager
     */
    getCacheKey(userId: Snowflake, guildId: Snowflake) {
        return `${guildId}:${userId}`;
    }

    /**
     * Returns GuildMemberWrapper saved in cache
     *
     * @param {GuildWrapperResolvable} guild Guild to search in
     * @param {UserWrapperResolvable} user User in guild to search for
     * @param {LoadOptions<GuildMemberObject>} [options] LoadOptions that should be passed to the wrapper
     * @returns
     * @memberof GuildMemberManager
     */
    get(guild: GuildWrapperResolvable, user: UserWrapperResolvable, options?: LoadOptions<GuildMemberObject>) {
        let userID = this.userManager.resolveId(user);
        let guildID = this.guildManager.resolveId(guild);
        return this.getCached(options, userID, guildID);
    }

    /**
     * Searched the database and cache for a GuildMemberObject. 
     * If one isn't found and it's specified in the options a new GuildMemberObject is created
     *
     * @param {GuildWrapperResolvable} guild Guild to search in
     * @param {UserWrapperResolvable} user User in guild to search for
     * @param {FetchOptions<GuildMemberObject>} [options] Fetch options (include load options passed to wrapper)
     * @returns
     * @memberof GuildMemberManager
     */
    async fetch(guild: GuildWrapperResolvable, user: UserWrapperResolvable, options?: FetchOptions<GuildMemberObject>) {
        let userWrapper = await this.userManager.resolve(user, true)
        let guildWrapper = await this.guildManager.resolve(guild, true);
        let sharedArgs = [userWrapper.id, guildWrapper.id]
        return this._fetch(sharedArgs, [userWrapper, guildWrapper, this.commandModule], sharedArgs, options);
    }

    /**
     * Resolves GuildMemberWrapperResolvable to a GuildMemberWrapper
     *
     * @param {GuildWrapperResolvable} guild Guild of member
     * @param {GuildMemberWrapperResolvable} guildMember Resolvable ti resolve
     * @param {boolean} [fetch=false] If not cached GuildWrappers should be fetched
     * @returns
     * @memberof GuildMemberManager
     */
    async resolve(guild: GuildWrapperResolvable, guildMember: GuildMemberWrapperResolvable, fetch = false) {
        if (guildMember instanceof GuildMemberWrapper) return guildMember;
        if (fetch) return this.fetch(guild, guildMember, { fields: [] });
        return this.get(guild, guildMember, { fields: [] });
    }

    resolveId(guild: Guild, guildMember: GuildMemberWrapperResolvable): Snowflake {
        if (guildMember instanceof GuildMemberWrapper) return guildMember.id;
        return guild.members.resolveID(guildMember);
    }

}