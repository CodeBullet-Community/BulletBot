import { Parser, ParseOptions, ParseOptionsType } from "./parser";
import { UserWrapper } from "../database/wrappers/main/userWrapper";
import { GuildWrapper } from "../database/wrappers/main/guildWrapper";
import { UserManager } from "../database/managers/main/userManager";

/**
 * Parse options for the UserParser
 *
 * @export
 * @interface UserParseOptionsType
 * @extends {ParseOptionsType<UserWrapper>}
 */
export interface UserParseOptionsType extends ParseOptionsType<UserWrapper> {
    /**
     * Guild that the parser can search in.
     * It only takes effect if `onlyStart` is `true`.
     * If set, the parser will also search by username and nickname.
     * (default `undefined`)
     *
     * @type {GuildWrapper}
     * @memberof UserParseOptionsType
     */
    guild?: GuildWrapper;
}

/**
 * Wrapper class for UserParseOptionsType
 *
 * @export
 * @class UserParseOptions
 * @extends {ParseOptions<UserWrapper>}
 * @implements {UserParseOptionsType}
 */
export class UserParseOptions extends ParseOptions<UserWrapper> implements UserParseOptionsType {

    guild?: GuildWrapper;

    constructor(options: UserParseOptionsType) {
        super(options);
        this.addOptions<UserParseOptionsType>({
            guild: () => this.onlyStart ? (this._options as UserParseOptionsType).guild : undefined
        });
    }

}

/**
 * Parser for parsing strings into UserWrappers
 *
 * @export
 * @class UserParser
 * @extends {Parser<UserWrapper, UserParseOptionsType>}
 */
export class UserParser extends Parser<UserWrapper, UserParseOptionsType> {

    private readonly userManager: UserManager;

    constructor(userManager: UserManager) {
        super();
        this.userManager = userManager;
    }

    private matchUserMention(raw: string, onlyStart: boolean) {
        return raw.match(this.getRegex(/<@!?(\d{17,19})>/, onlyStart));
    }

    private matchSnowflake(raw: string, onlyStart: boolean) {
        return raw.match(this.getRegex(/(\d{17,19})/, onlyStart))?.[1];
    }

    /**
     * Parses a string into UserWrapper
     *
     * @param {string} raw String to parse
     * @param {UserParseOptionsType} [options] UserParseOptionsType
     * @returns
     * @memberof UserParser
     */
    async parse(raw: string, options?: UserParseOptionsType) {
        let wrappedOptions = new UserParseOptions(options);

        let mentionMatch = this.matchUserMention(raw, wrappedOptions.onlyStart);
        let snowflake = this.matchSnowflake(raw, wrappedOptions.onlyStart);
        let wrapper = await this.userManager.fetch(mentionMatch?.[1] ?? snowflake);
        if (wrapper) return this.generateResult(wrapper, mentionMatch?.[0].length ?? snowflake.length);

        if (!wrappedOptions.guild) return this.getNoParseResult(wrappedOptions);

        let result = await wrappedOptions.guild.memberParser.parse(raw, {
            onlyStart: true,
            searchById: false,
            searchByName: true,
            allowNotExact: wrappedOptions.allowNotExact,
            similarityThreshold: wrappedOptions.similarityThreshold
        });
        if (!result) return this.getNoParseResult(wrappedOptions);
        return this.generateResult(result.value.user, result.length, result.exactMatch);
    }

}
