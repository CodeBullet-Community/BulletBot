import { Parser, ParseOptions, ParseOptionsType } from "./parser";
import { UserWrapper } from "../database/wrappers/main/userWrapper";
import { GuildWrapper } from "../database/wrappers/main/guildWrapper";
import { UserManager } from "../database/managers/main/userManager";
import { SnowflakeParser } from "./snowflakeParser";
import { singleton } from "tsyringe";

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
@singleton()
export class UserParser extends Parser<UserWrapper, UserParseOptionsType> {

    private readonly userManager: UserManager;
    private readonly snowflakeParser: SnowflakeParser;

    constructor(userManager: UserManager, snowflakeParser: SnowflakeParser) {
        super();
        this.userManager = userManager;
        this.snowflakeParser = snowflakeParser;
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

        let snowflakeResult = await this.snowflakeParser.parse(raw, {
            onlyStart: wrappedOptions.onlyStart,
            types: ['plain', 'user']
        });
        if (snowflakeResult) {
            let wrapper = await this.userManager.fetch(snowflakeResult.value);
            if (wrapper) return this.generateResult(wrapper, snowflakeResult.length);
        }

        if (!wrappedOptions.guild) return this.getNoParseResult(wrappedOptions);
        let memberResult = await wrappedOptions.guild.memberParser.parse(raw, {
            onlyStart: true,
            searchById: false,
            searchByName: true,
            allowNotExact: wrappedOptions.allowNotExact,
            similarityThreshold: wrappedOptions.similarityThreshold
        });
        if (!memberResult) return this.getNoParseResult(wrappedOptions);
        return this.generateResult(memberResult.value.user, memberResult.length, memberResult.exactMatch);
    }

}
