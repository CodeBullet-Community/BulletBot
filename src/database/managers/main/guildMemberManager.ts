import { GuildResolvable, Snowflake, UserResolvable } from 'discord.js';

import { Bot } from '../../..';
import { Commands } from '../../../commands';
import { Database } from '../../database';
import { GuildMemberObject, guildMemberSchema } from '../../schemas/main/guildMember';
import { LoadOptions } from '../../wrappers/docWrapper';
import { GuildMemberWrapper } from '../../wrappers/main/guildMemberWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions } from '../collectionManager';
import { UserManager } from './userManager';

export class GuildMemberManager extends CacheManager<GuildMemberObject, GuildMemberWrapper> {

    private readonly bot: Bot;
    private readonly userManager: UserManager;
    private readonly guildManager: GuildManager;
    private readonly commandModule: Commands;

    constructor(bot: Bot, database: Database, userManager: UserManager, guildManager: GuildManager, commandModule: Commands) {
        super(database, 'main', 'guildMember', guildMemberSchema, GuildMemberWrapper);
        this.bot = bot;
        this.commandModule = commandModule;
    }

    getDefaultObject(userID: Snowflake, guildID: Snowflake) {
        return {
            user: userID,
            guild: guildID,
            commandLastUsed: {}
        };
    }

    getCacheKey(userID: Snowflake, guildID: Snowflake) {
        return `${guildID}:${userID}`;
    }

    get(user: UserResolvable, guild: GuildResolvable, options?: LoadOptions<GuildMemberObject>) {
        let userID = this.bot.client.users.resolveID(user);
        let guildID = this.bot.client.guilds.resolveID(guild);
        return this.getCached(options, userID, guildID);
    }

    async fetch(user: UserResolvable, guild: GuildResolvable, options?: FetchOptions<GuildMemberObject>) {
        let userWrapper = await this.userManager.fetch(user, { fields: [] })
        let guildWrapper = await this.guildManager.fetch(guild, { fields: [] });
        let sharedArgs = [userWrapper.id, guildWrapper.id]
        return this._fetch(sharedArgs, [userWrapper, guildWrapper, this.commandModule], sharedArgs, options);
    }

}