import { Options } from "../utils/options";

/**
 * ParserOption type for altering the behavior of parsing
 *
 * @export
 * @interface ParseOptionsType
 * @template Type
 */
export interface ParseOptionsType<Type> {
    /**
     * If the parser should only parse things at the start of the string (default `false`)
     *
     * @type {boolean}
     * @memberof ParseOptionsType
     */
    onlyStart?: boolean;
    /**
     * What defaultValue to return if the parser was unable to parse the string.
     * Default value result will always have length `0` and exactMatch set to `false`.
     * `undefined` value will make the parser return undefined instead of a ParseResult. 
     * (default `undefined`)
     *
     * @type {Type}
     * @memberof ParseOptionsType
     */
    defaultValue?: Type;
    /**
     * If parser is allowed to guess what the value should be. 
     * This only applies if `onlyStart` is set to true. (default `false`)
     *
     * @type {boolean}
     * @memberof ParseOptionsType
     */
    allowNotExact?: boolean;
    /**
     * Similarity threshold for string comparison when guessing what the value should be.
     * (default `Parser.similarityThreshold`)
     *
     * @type {number}
     * @memberof ParseOptionsType
     */
    similarityThreshold?: number;
}

/**
 * Helper class implementing ParseOptionsType and adding default values
 *
 * @export
 * @class ParseOptions
 * @extends {Options<ParseOptionsType<Type>>}
 * @implements {ParseOptionsType<Type>}
 * @template Type
 */
export class ParseOptions<Type> extends Options<ParseOptionsType<Type>> implements ParseOptionsType<Type> {

    onlyStart: boolean;
    defaultValue?: Type;
    allowNotExact: boolean;
    similarityThreshold: number;

    constructor(options?: ParseOptionsType<Type>) {
        super({
            onlyStart: false,
            defaultValue: undefined,
            allowNotExact: () => this.onlyStart && this._options.allowNotExact,
            similarityThreshold: Parser.similarityThreshold
        });
        this.set(options);
    }
}

/**
 * Result returned after parsing
 *
 * @export
 * @interface ParseResult
 * @template Type
 */
export interface ParseResult<Type> {
    /**
     * Value that was parsed
     *
     * @type {Type}
     * @memberof ParseResult
     */
    value: Type;
    /**
     * Length of substring that value was parsed from
     *
     * @type {number}
     * @memberof ParseResult
     */
    length: number;
    /**
     * If the value is an exact match or if the parser guessed the value
     *
     * @type {boolean}
     * @memberof ParseResult
     */
    exactMatch: boolean;
}

export abstract class Parser<Type, OptionsType extends ParseOptionsType<Type> = ParseOptionsType<Type>, OptionsClass extends ParseOptions<Type> = ParseOptions<Type>> {

    /**
     * Default similarity threshold for when two strings are close enough
     *
     * @static
     * @memberof Parser
     */
    static similarityThreshold = 0.4;

    /**
     * Parses a string into something. 
     * 
     * IMPORTANT: `options` parameter can take in the raw option object and first needs to be wrapped in the ParseOptions class before use.
     *
     * @abstract
     * @param {string} raw Raw string to parse
     * @param {OptionsType} [options] Parse options
     * @returns {Promise<ParseResult<Type>>}
     * @memberof Parser
     */
    abstract parse(raw: string, options?: OptionsType): Promise<ParseResult<Type>>;

    /**
     * Returns a copy of the provided pattern.
     * If onlyStart is equal to true it will add the `y` flag (sticky flag).
     * ONLY use this regex ONCE as it's lastIndex will change after use and thus become invalid.
     *
     * @protected
     * @param {(RegExp | string)} pattern
     * @param {boolean} onlyStart
     * @returns
     * @memberof Parser
     */
    protected getRegex(pattern: RegExp | string, onlyStart: boolean) {
        return new RegExp(pattern, onlyStart ? 'y' : undefined);
    }

    /**
     * Generates the parse results.
     * Look at ParseResult<Type> for argument documentation.
     *
     * @protected
     * @param {Type} value
     * @param {number} length
     * @param {boolean} [exactMatch=true] (default `true`)
     * @returns {ParseResult<Type>}
     * @memberof Parser
     */
    protected generateResult(value: Type, length: number, exactMatch = true): ParseResult<Type> {
        return { value, length, exactMatch };
    }

    /**
     * Return this function call when the string could not be parsed. 
     * This will either return `undefined` or the default value result.
     *
     * @protected
     * @param {OptionsClass} options Options passed to 
     * @returns {ParseResult<Type>}
     * @memberof Parser
     */
    protected getNoParseResult(options: OptionsClass): ParseResult<Type> {
        if (options.defaultValue === undefined) return undefined;
        return {
            value: options.defaultValue,
            length: 0,
            exactMatch: false
        };
    }

} 
