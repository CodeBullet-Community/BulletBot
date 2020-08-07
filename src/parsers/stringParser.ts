import { Parser, ParseOptions, ParseOptionsType } from "./parser";
import _ from "lodash";
import { findBestMatch } from "string-similarity";

/**
 * Parse options for the StringParser
 *
 * @export
 * @interface StringParseOptionsType
 * @extends {ParseOptionsType<string>}
 */
export interface StringParseOptionsType extends ParseOptionsType<string> {
    /**
     * Array of valid values. (default `undefined`)
     *
     * @type {string[]}
     * @memberof StringParseOptionsType
     */
    validValues?: string[];
    /**
     * If parser should interpret the closest space to the start as limiter.
     * Only takes effect if `validValues` is not set.
     * (default `false`)
     *
     * @type {boolean}
     * @memberof StringParseOptionsType
     */
    split?: boolean;
    /**
     * If parser should interpret `"` as limiters.
     * Only takes effect if `validValues` is not set.
     * (default `false`)
     *
     * @type {boolean}
     * @memberof StringParseOptionsType
     */
    quotesAsLimiters?: boolean;
}

/**
 * Wrapper class for StringParseOptionsType
 *
 * @export
 * @class StringParseOptions
 * @extends {ParseOptions<string>}
 * @implements {StringParseOptionsType}
 */
export class StringParseOptions extends ParseOptions<string> implements StringParseOptionsType {

    validValues?: string[];
    split: boolean;
    quotesAsLimiters: boolean;

    constructor(options?: StringParseOptionsType) {
        super(options);
        this.addOptions<StringParseOptionsType>({
            validValues: undefined,
            split: false,
            quotesAsLimiters: false
        });
    }

}

/**
 * Parser for certain strings or parts of strings in a string
 *
 * @export
 * @class StringParser
 * @extends {Parser<string, StringParseOptionsType>}
 */
export class StringParser extends Parser<string, StringParseOptionsType> {

    /**
     * Matches text in quotes. 
     * If there is no text inside the quotes or there are no quotes it will return `undefined`.
     *
     * @private
     * @param {string} raw String to match against
     * @param {boolean} onlyStart If quotes need to be at the start of the string
     * @returns
     * @memberof StringParser
     */
    private matchTextInQuotes(raw: string, onlyStart: boolean) {
        return raw.match(this.getRegex(/"(.+?)"/, onlyStart))?.[1];
    }

    /**
     * Gets all the text before a certain character. 
     * If the character is not found it just returns the entire string.
     *
     * @private
     * @param {string} raw String to split
     * @param {string} splitter Character to split by
     * @param {number} splittingStart At what index to start splitting
     * @returns
     * @memberof StringParser
     */
    private getTextBeforeSplit(raw: string, splitter: string, splittingStart: number) {
        return raw.substring(0, splittingStart) + raw.substring(splittingStart).split(splitter).shift();
    }

    /**
     * Parses a string according to the options. By default just returns the same string.
     *
     * @param {string} raw String to parse
     * @param {StringParseOptionsType} options StringParseOptions
     * @returns
     * @memberof StringParser
     */
    async parse(raw: string, options: StringParseOptionsType) {
        let wrappedOptions = new StringParseOptions(options);

        if (wrappedOptions.validValues == null) {
            if (wrappedOptions.quotesAsLimiters) {
                let inQuotes = this.matchTextInQuotes(raw, wrappedOptions.onlyStart);
                if (inQuotes)
                    return this.generateResult(inQuotes, inQuotes.length + 2);
            }
            let value = wrappedOptions.split ? this.getTextBeforeSplit(raw, ' ', 0) : raw;
            return this.generateResult(value, value.length);
        }
        for (const value of wrappedOptions.validValues)
            if (raw.match(this.getRegex(_.escapeRegExp(value), wrappedOptions.onlyStart)))
                return this.generateResult(value, value.length, true);

        if (!wrappedOptions.allowNotExact) return this.getNoParseResult(wrappedOptions);

        let bestMatch = findBestMatch(raw, wrappedOptions.validValues).bestMatch;
        if (bestMatch.rating < wrappedOptions.similarityThreshold)
            return this.getNoParseResult(wrappedOptions);
        let value = bestMatch.target;
        let length = this.getTextBeforeSplit(raw, ' ', value.length).length;
        return this.generateResult(value, length, false);
    }

}
