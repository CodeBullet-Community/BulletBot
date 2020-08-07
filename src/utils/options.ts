import _ from 'lodash';

/**
 * Default value or getter for an option
 */
type OptionValue<OptionsType extends object, Key extends keyof OptionsType> =
    OptionsType[Key] extends Function ?
    () => OptionsType[Key] : ((() => OptionsType[Key]) | OptionsType[Key]);

/**
 * Object defining an options type
 */
type OptionsDefinition<OptionsType extends object> = {
    [Key in keyof OptionsType]-?: OptionValue<OptionsType, Key>;
};

/**
 * Object that defines an options type with additional options
 */
type AdditionalOptionsDefinition<OptionsType extends object, Additional extends object> =
    {
        [RequiredKeys in keyof Omit<Additional, Extract<keyof Additional, keyof OptionsType>>]-?: OptionValue<Additional, RequiredKeys>;
    } & {
        [OptionalKeys in keyof OptionsType]?: OptionValue<OptionsType, OptionalKeys>;
    };

/**
 * Options which also implement default values and custom getters
 *
 * @export
 * @abstract
 * @class Options
 * @template OptionsType Type of options this class holds
 */
export abstract class Options<OptionsType extends object> {

    /**
     * Inner object holding the raw state of the options without getters or default values
     *
     * @protected
     * @type {Partial<OptionsType>}
     * @memberof Options
     */
    protected _options: Partial<OptionsType>;

    /**
     * Creates an instance of Options.
     * 
     * @param {OptionsDefinition<OptionsType>} options Initial definition of the options
     * @memberof Options
     */
    constructor(options: OptionsDefinition<OptionsType>) {
        this._options = {}
        if (options)
            this.addOptions(options);
    }

    /**
     * If an extended class adds options use this method to register them. They can also overwrite existing options.
     *
     * @protected
     * @template AdditionalOptionsType Type of the new options extending the original
     * @param {AdditionalOptionsDefinition<OptionsType, AdditionalOptionsType>} options Additional options definition
     * @memberof Options
     */
    protected addOptions<AdditionalOptionsType extends object>(options: AdditionalOptionsDefinition<OptionsType, AdditionalOptionsType>) {
        Object.entries(options).forEach((value) => this.addOption(value[0] as any, value[1] as any));
    }

    /**
     * Adds a options according to its value to this instance
     *
     * @private
     * @template Key
     * @param {Key} name Name to add it under
     * @param {OptionValue<OptionsType, Key>} value Value describing the option
     * @memberof Options
     */
    private addOption<Key extends keyof OptionsType>(name: Key, value: OptionValue<OptionsType, Key>) {
        Object.defineProperty(this, name, {
            get: typeof value === 'function' ? value as () => any : () => this._options[name] || value,
            set: v => this._options[name] = v,
            configurable: true
        });
    }

    /**
     * Assigns the provided values to the this._options. 
     * This assignment is on a per key basis so won't overwrite existing values not defined in the provided options.
     *
     * @protected
     * @template AdditionalOptionsType Type of the new options extending the original
     * @param {(OptionsType & AdditionalOptionsType)} options Options to assign to this._options
     * @memberof Options
     */
    protected set<AdditionalOptionsType extends object>(options: Partial<OptionsType & AdditionalOptionsType>) {
        _.assign(this._options, options);
    }

}