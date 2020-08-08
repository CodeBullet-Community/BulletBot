import { Snowflake } from 'discord.js';
import { singleton } from 'tsyringe';

import { ParseOptions, ParseOptionsType, Parser } from './parser';
import { keys } from 'ts-transformer-keys';

/**
 * Types of snowflake usage that SnowflakeParser can parse
 */
export type SnowflakeTypes = 'plain' | 'user' | 'channel' | 'role';

/**
 * Parse options for the SnowflakeParser
 *
 * @export
 * @interface SnowflakeParseOptionsType
 * @extends {ParseOptionsType<Snowflake>}
 */
export interface SnowflakeParseOptionsType extends ParseOptionsType<Snowflake> {
    /**
     * If to also search for a plain snowflake in quotes. (default `true`)
     *
     * @type {boolean}
     * @memberof SnowflakeParseOptionsType
     */
    plainInQuotes?: boolean;
    /**
     * Types of snowflake usages to search for. (default every possible type)
     *
     * @type {SnowflakeTypes[]}
     * @memberof SnowflakeParseOptionsType
     */
    types?: SnowflakeTypes[];
}

/**
 * Wrapper class for SnowflakeParseOptionsType
 *
 * @export
 * @class SnowflakeParseOptions
 * @extends {ParseOptions<Snowflake>}
 */
export class SnowflakeParseOptions extends ParseOptions<Snowflake> implements SnowflakeParseOptionsType {

    plainInQuotes: boolean;
    types: SnowflakeTypes[]

    constructor(options: SnowflakeParseOptionsType) {
        super(options);
        this.addOptions<SnowflakeParseOptionsType>({
            plainInQuotes: true,
            types: keys<{ [k in SnowflakeTypes]: any }>()
        });
    }

}

/**
 * Parser for parsing strings into snowflakes
 *
 * @export
 * @class SnowflakeParser
 * @extends {Parser<Snowflake>}
 */
@singleton()
export class SnowflakeParser extends Parser<Snowflake>{

    private static snowflakePattern = '(\\d{17,19})';
    private static mentionPatterns = {
        user: `<@!?${SnowflakeParser.snowflakePattern}>`,
        channel: `<#${SnowflakeParser.snowflakePattern}>`,
        role: `<@&${SnowflakeParser.snowflakePattern}>`
    }

    /**
     * Parses a string into a snowflake.
     *
     * @param {string} raw String to parse
     * @param {SnowflakeParseOptionsType} [options] SnowflakeParseOptions
     * @returns
     * @memberof SnowflakeParser
     */
    async parse(raw: string, options?: SnowflakeParseOptionsType) {
        let wrappedOptions = new SnowflakeParseOptions(options);
        if (wrappedOptions.types.includes('plain')) {
            let match = this.matchRegex(raw, SnowflakeParser.snowflakePattern, wrappedOptions.onlyStart);
            if (!match && options.plainInQuotes)
                match = this.matchRegex(raw, `"${SnowflakeParser.snowflakePattern}"`, wrappedOptions.onlyStart);
            if (match)
                return this.generateResult(match.value, match.length);
        }
        for (const type of wrappedOptions.types) {
            if (type == 'plain') continue;
            let match = this.matchRegex(raw, SnowflakeParser.mentionPatterns[type], wrappedOptions.onlyStart);
            if (match) return this.generateResult(match.value, match.length);
        }
        return this.getNoParseResult(wrappedOptions);
    }
}
