import { Parser, ParseOptions, ParseOptionsType, ParseResult } from "./parser";
import { GuildMemberWrapper } from "../database/wrappers/main/guildMemberWrapper";
import { GuildWrapper } from "../database/wrappers/main/guildWrapper";
import { UserParser, UserParseOptions, UserParseOptionsType } from "./userParser";
import { container } from "tsyringe";
import { StringParser } from "./stringParser";
import { PropertyPath } from "lodash";
import { GuildMember } from "discord.js";
import { compareTwoStrings } from "string-similarity";
import _ from "lodash";

/**
 * Parse options for the GuildMemberParser
 *
 * @export
 * @interface GuildMemberParseOptionsType
 * @extends {ParseOptionsType<GuildMemberWrapper>}
 */
export interface GuildMemberParseOptionsType extends ParseOptionsType<GuildMemberWrapper> {
    /**
     * If parser should search by username and nickname.
     * Only takes effect if `onlyStart` is `true`.
     * (default `false`)
     *
     * @type {boolean}
     * @memberof GuildMemberParseOptionsType
     */
    searchByName?: boolean;
    /**
     * If parser should check for a user id in the string. (default `true`)
     *
     * @type {boolean}
     * @memberof GuildMemberParseOptionsType
     */
    searchById?: boolean;
}

/**
 * Wrapper class for GuildMemberParseOptionsType
 *
 * @export
 * @class GuildMemberParseOptions
 * @extends {ParseOptions<GuildMemberWrapper>}
 */
export class GuildMemberParseOptions extends ParseOptions<GuildMemberWrapper> implements GuildMemberParseOptionsType {

    searchByName: boolean;
    searchById: boolean;

    constructor(options: GuildMemberParseOptionsType) {
        super(options);
        this.addOptions<GuildMemberParseOptionsType>({
            searchByName: () => this.onlyStart && (this._options as GuildMemberParseOptionsType).searchByName,
            searchById: true
        });
    }

}

/**
 * Parser that parses strings into GuildMemberWrappers
 *
 * @export
 * @class GuildMemberParser
 * @extends {Parser<GuildMemberWrapper, GuildMemberParseOptionsType>}
 */
export class GuildMemberParser extends Parser<GuildMemberWrapper, GuildMemberParseOptionsType>{

    readonly guild: GuildWrapper;

    private readonly userParser: UserParser;
    private readonly stringParser: StringParser;

    constructor(guild: GuildWrapper) {
        super();
        this.guild = guild;
        this.userParser = container.resolve(UserParser);
        this.stringParser = container.resolve(StringParser);
    }

    /**
     * Parses a string into a GuildMemberWrapper
     *
     * @param {string} raw
     * @param {GuildMemberParseOptionsType} [options]
     * @returns {Promise<ParseResult<GuildMemberWrapper>>}
     * @memberof GuildMemberParser
     */
    async parse(raw: string, options?: GuildMemberParseOptionsType): Promise<ParseResult<GuildMemberWrapper>> {
        let wrappedOptions = new GuildMemberParseOptions(options);
        if (wrappedOptions.searchById) {
            let result = await this.parseAsUser(raw, wrappedOptions);
            if (result != null) return result;
        }

        if (!wrappedOptions.searchByName) return this.getNoParseResult(wrappedOptions);
        let name = await this.stringParser.parse(raw, { onlyStart: true, split: true, quotesAsLimiters: true });
        let searchName = name.value.substring(0, 32);
        await this.guild.guild.members.fetch();

        let member = this.guild.guild.members.cache.find(m => m.user.username == searchName) ??
            this.guild.guild.members.cache.find(m => m.nickname == searchName);
        if (member)
            return this.generateResult(await this.guild.members.fetch(member), name.length);

        if (!wrappedOptions.allowNotExact) return this.getNoParseResult(wrappedOptions);
        member = this.reduceMembersToClosestName(searchName, ['user', 'username'], wrappedOptions.similarityThreshold) ??
            this.reduceMembersToClosestName(searchName, ['nickname'], wrappedOptions.similarityThreshold);
        if (!member) return this.getNoParseResult(wrappedOptions);
        return this.generateResult(await this.guild.members.fetch(member), name.length, false);
    }

    /**
     * Parses the string as a user and then converts it into a GuildMemberWrapper parse result.
     *
     * @private
     * @param {string} raw
     * @param {GuildMemberParseOptions} options
     * @returns
     * @memberof GuildMemberParser
     */
    private async parseAsUser(raw: string, options: GuildMemberParseOptions) {
        let result = await this.userParser.parse(raw, { onlyStart: options.onlyStart });
        if (!result) return undefined;
        let member = this.guild.members.fetch(result.value);
        if (!member) return undefined;
        return this.generateResult(member, result.length, result.exactMatch);
    }

    /**
     * Reduces the member list to a single member and returns it if the match passes the `similarityThreshold`
     *
     * @private
     * @param {string} name Name to search for
     * @param {PropertyPath} propertyPath PropertyPath to the name in the member object
     * @param {number} similarityThreshold
     * @returns
     * @memberof GuildMemberParser
     */
    private reduceMembersToClosestName(name: string, propertyPath: PropertyPath, similarityThreshold: number) {
        let bestSimilarity = 0;
        let closest = this.guild.guild.members.cache.reduce<GuildMember>((accMember, member) => {
            let similarity = compareTwoStrings(name, _.get(member, propertyPath));
            if (similarity <= bestSimilarity) return accMember;
            bestSimilarity = similarity;
            return member;
        });
        if (bestSimilarity < similarityThreshold) return undefined;
        return closest;
    }

}
