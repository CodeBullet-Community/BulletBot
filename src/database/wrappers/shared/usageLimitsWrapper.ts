import _ from 'lodash';
import { keys } from 'ts-transformer-keys';

import { CommandName, CommandResolvable, Commands } from '../../../commands';
import { CommandUsageLimits, UsageLimits } from '../../schemas/global';
import { DocWrapper } from '../docWrapper';
import { PropertyWrapper } from '../propertyWrapper';

/**
 * Wraps the usage limits property
 *
 * @export
 * @class UsageLimitsWrapper
 * @extends {PropertyWrapper<Parent, UsageLimits>}
 * @implements {UsageLimits}
 * @template Parent DocWrapper which hold this PropertyWrapper
 */
export class UsageLimitsWrapper<Parent extends DocWrapper<any>> extends PropertyWrapper<Parent, UsageLimits> implements UsageLimits {

    private readonly commandModule: Commands;
    readonly parentUsageLimits: UsageLimits;
    readonly commands?: {
        readonly [K in CommandName]: CommandUsageLimits;
    };
    readonly cases?: {
        readonly maxCases?: number;
        readonly storeTime?: number;
    };
    readonly webhooks?: {
        readonly maxWebhooks?: number;
        readonly maxMessageLength?: number;
    };
    readonly pActions?: {
        readonly maxTime?: number;
    };
    readonly megalog?: {
        readonly disabled?: [string];
    };
    readonly logs?: {
        readonly maxLogs?: number;
        readonly storeTime?: number;
    };
    readonly guild?: {
        readonly maxInactiveTime?: number;
    };

    /**
     * Creates an instance of UsageLimitsWrapper and subscribes to the parent data to automatically synchronize data
     * 
     * @param {Parent} parent DocWrapper that holds this PropertyWrapper
     * @param {Commands} commandModule CommandModule to resolve commands
     * @param {UsageLimits} [parentUsageLimits] UsageLimits of higher scope to inherit from
     * @memberof UsageLimitsWrapper
     */
    constructor(parent: Parent, commandModule: Commands, parentUsageLimits?: UsageLimits) {
        super(parent, 'usageLimits', keys<UsageLimits>());
        this.setDataGetters();
        this.commandModule = commandModule;
        this.parentUsageLimits = parentUsageLimits;
    }

    /**
     * Custom data getter generator to take into account the parent usage limits
     *
     * @protected
     * @param {keyof UsageLimits} key Key to generate getter for
     * @returns
     * @memberof UsageLimitsWrapper
     */
    protected dataGetterGenerator(key: keyof UsageLimits) {
        return () => {
            if (this.parentUsageLimits === undefined)
                return this.data.value[key];
            return _.assign(this.data.value[key], this.parentUsageLimits[key]);
        }
    }

    /**
     * Returns command usage limits without taking hard coded limits into account
     *
     * @private
     * @param {string} command
     * @returns
     * @memberof UsageLimitsWrapper
     */
    private getRawCommandUsageLimits(command: string) {
        if (!this.commands[command]) return {};
        return this.commands[command];
    }

    /**
     * Merges usage limits with inline command usage limits
     *
     * @param {CommandResolvable} command Command to get usage limits from
     * @returns Merged usage limits
     * @memberof UsageLimitsWrapper
     */
    getCommandUsageLimits(command: CommandResolvable) {
        let commandObj = this.commandModule.resolve(command);
        let rawLimits = this.getRawCommandUsageLimits(commandObj.name);

        return {
            globalCooldown: rawLimits.globalCooldown || commandObj.cooldownGlobal,
            localCooldown: rawLimits.localCooldown || commandObj.cooldownLocal,
            enabled: rawLimits.enabled !== undefined ? rawLimits.enabled : true
        };
    }
}