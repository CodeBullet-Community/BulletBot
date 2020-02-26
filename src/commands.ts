import { Collection, Guild, Message } from 'discord.js';
import * as fs from 'fs';

import { Bot } from '.';
import { CommandCacheWrapper } from './database/wrappers/commandCacheWrapper';
import { GuildWrapper, GuildWrapperResolvable } from './database/wrappers/guildWrapper';
import { CommandUsageLimits } from './database/schemas';
import { durationToString, permToString } from './utils/parsers';
import { PermLevel, PermLevels } from './utils/permissions';
import { resolveCommand, resolveGuildWrapper } from './utils/resolvers';
import { BenchmarkTimestamp } from './utils/time';

/**
 * definition of a command with all it's properties and functions
 *
 * @export
 * @interface commandInterface
 */
export interface commandInterface {
    /**
     * name of filter
     *
     * @type {CommandName}
     * @memberof commandInterface
     */
    name: CommandName;
    /**
     * optional property that should be set as empty string. It can change the actual position in the structure. The categories are separated by /
     *
     * @type {string}
     * @memberof commandInterface
     */
    path: string;
    /**
     * if command can be used in dms
     *
     * @type {boolean}
     * @memberof commandInterface
     */
    dm: boolean;
    /**
     * what perm level is needed to use this command
     *  0. member
     *  1. immune member
     *  2. mod
     *  3. admin
     *  4. bot master
     *
     * @type {PermLevel}
     * @memberof commandInterface
     */
    permLevel: PermLevel;
    /**
     * if command can be toggled in guilds
     *
     * @type {boolean}
     * @memberof commandInterface
     */
    togglable: boolean;
    /**
     * time in ms, until a command can be used again in a guild / dm
     *
     * @type {number}
     * @memberof commandInterface
     */
    cooldownLocal?: number;
    /**
     * time in ms, until a command can be used again by a user globally
     *
     * @type {number}
     * @memberof commandInterface
     */
    cooldownGlobal?: number;
    /**
     * contains info about what the command is and how to use it
     *
     * @memberof commandInterface
     */
    help: {
        /**
         * a short description of the command does
         *
         * @type {string}
         */
        shortDescription: string;
        /**
         * a long description of the command does and also maybe how to use it and how it works
         *
         * @type {string}
         */
        longDescription: string;
        /**
         * array of different usages
         *
         * @type {string[]}
         */
        usages: string[];
        /**
         * array of examples. They don't have to directly correspond to the usages but it's recommended
         *
         * @type {string[]}
         */
        examples: string[];
        /**
         * Array of additional fields that should be added in the help embed.
         *
         */
        additionalFields?: {
            name: string;
            value: string;
            inline?: boolean;
        }[];
    };
    /**
     * function that called if someone uses the command
     *
     * @param {Message} message message that requested the command
     * @param {string} args arguments
     * @param {PermLevel} permLevel permLevel of the user that requested the command
     * @param {GuildWrapper} guildWrapper guild wrapper is only provided if dm is false
     * @param {boolean} dm if message came from dms
     * @param {BenchmarkTimestamp} requestTime var for performance tracking
     * @param {CommandCacheWrapper} [commandCache] optional parameter, if command was called with cache
     * @returns if command was successful. True and undefined means yes. If it yes, the cooldown gets set if a time is specified
     * @memberof commandInterface
     */
    run(message: Message, args: string, permLevel: PermLevel, dm: boolean, guildWrapper: GuildWrapper, requestTime: BenchmarkTimestamp, commandCache?: CommandCacheWrapper): Promise<boolean>;
}

export type CommandName = string
export type CommandResolvable = CommandName | commandInterface;

/**
 * loads all commands and runs all commands
 *
 * @export
 * @class Commands
 */
export class Commands {
    /**
     * collection of all commands and their name as key
     *
     * @type {Collection<string, commandInterface>}
     * @memberof Commands
     */
    commands: Collection<string, commandInterface>;
    /**
     * all commands structured like in the folders or like defined with the path property
     *
     * @type {*}
     * @memberof Commands
     */
    structure: any;

    /**
     * Creates an instance of Commands.
     * 
     * @param {string} dir directory where commands are in
     * @memberof Commands
     */
    constructor(dir: string) {
        this.commands = new Collection();
        this.structure = {};
        this.loadCommands(dir, this.structure);
    }

    /**
     * loads commands in specific folder and calls it self if it encounters another folder
     *
     * @param {string} dir folder to load commands from
     * @param {*} structureObject current structure tree of folder
     * @memberof Commands
     */
    loadCommands(dir: string, structureObject: any) {
        fs.readdir(dir, (err, files) => {
            if (err) console.error(err);

            var folders = files.filter(f => fs.lstatSync(dir + f).isDirectory()); // filters out all non folder paths and calls it self for all remaining paths
            folders.forEach((f, i) => {
                structureObject[f.toLowerCase()] = { _categoryName: f }
                this.loadCommands(dir + f + '/', structureObject[f.toLowerCase()]);
            });

            var commands = files.filter(f => f.split('.').pop() == 'js'); // filters out all non js files and loads all remaining into the collection and structure tree
            if (commands.length <= 0) {
                console.error('no commands to load in ' + dir);
                return;
            }
            console.info(`loading ${commands.length} commands in ${dir}`);
            commands.forEach((f, i) => {
                var props: commandInterface = require(dir + f).default;
                console.info(`${i + 1}: ${f} loaded!`);
                this.commands.set(props.name, props);
                // puts command in structure
                var strucObject = structureObject;
                if (props.path != '') { // if custom path defined
                    var keys = props.path.toLowerCase().split('/');
                    strucObject = this.structure;
                    for (var i = 0; i < keys.length; i++) {
                        if (!strucObject[keys[i]]) {
                            strucObject[keys[i]] = { _categoryName: keys[i] };
                        }
                        strucObject = strucObject[keys[i]];
                    }
                }
                strucObject[props.name] = props;
            });
        });
    }

    /**
     * runs command if dm and permLevel criterias fit
     *
     * @param {Message} message message from where the request came from
     * @param {string} args arguments
     * @param {string} command command name
     * @param {number} permLevel perm level or member that send the message
     * @param {boolean} dm if message is from a dm
     * @param {GuildWrapper} guildWrapper guild wrapper is only provided if dm is false
     * @param {BenchmarkTimestamp} requestTime var for performance tracking
     * @returns
     * @memberof Commands
     */
    async runCommand(message: Message, args: string, command: CommandName, permLevel: PermLevels, dm: boolean, guildWrapper: GuildWrapper, requestTime: BenchmarkTimestamp) {
        var cmd = this.commands.get(command);
        // command not found
        if (!cmd) return false;
        // sends help embed if command isn't DM capable
        if (!cmd.dm && dm) {
            message.channel.send(this.getHelpEmbed(cmd));
            return false;
        }
        // member doesn't have permission
        if (permLevel < cmd.permLevel && !dm) {
            message.channel.send(`Permission denied. You have to be ${permToString(cmd.permLevel)}`); // returns if the member doesn't have enough perms
            return false;
        }

        // get command usage limits
        let commandUsageLimits = Bot.settings.getCommandUsageLimits(command);
        if (!dm) {
            commandUsageLimits = await guildWrapper.getCommandUsageLimits(command);
        }

        // check if user can use command
        let scope = (dm ? 'dm' : message.guild.id);
        let user = await Bot.database.getUserWrapper(message.author, 'commandLastUsed');
        if (!(await user.canUseCommand(scope, command, commandUsageLimits))) return false;

        if (!dm && !(await guildWrapper.commandIsEnabled(command))) return false;

        let output = await cmd.run(message, args, permLevel, dm, guildWrapper, requestTime); // run command

        // set cooldown if cooldown is defined and command was successful
        if ((commandUsageLimits.globalCooldown || commandUsageLimits.localCooldown) && output !== false)
            await user.setCommandLastUsed(scope, command, message.createdTimestamp);

        return output;
    }

    /**
     * runs command with cache
     *
     * @param {Message} message message from where the request came from
     * @param {CommandCacheWrapper} commandCache CommandCache
     * @param {PermLevels} permLevel perm level or member that send the message
     * @param {boolean} dm if message is from a dm
     * @param {GuildWrapper} guildWrapper guild wrapper is only provided if dm is false
     * @param {BenchmarkTimestamp} requestTime var for performance tracking
     * @returns
     * @memberof Commands
     */
    async runCachedCommand(message: Message, commandCache: CommandCacheWrapper, permLevel: PermLevels, dm: boolean, guildWrapper: GuildWrapper, requestTime: BenchmarkTimestamp) {
        var cmd = this.commands.get(commandCache.command.name);
        if (!cmd) {
            commandCache.remove();
            return;
        } // returns if it can't find the command
        if (!cmd.dm && dm) { // sends the embed help if the request is from a dm and the command doesn't support dms
            message.channel.send('This command can\'t be used in dms. The action was canceled.');
            commandCache.remove();
            return;
        }
        cmd.run(message, message.content, permLevel, dm, guildWrapper, requestTime, commandCache); // run command
    }

    /**
     * getter for command by name
     *
     * @param {string} command command name
     * @returns
     * @memberof Commands
     */
    get(command: CommandName) {
        return this.commands.get(command);
    }

    /**
     * creates a help embed for a specific command. When guild is specified it also changes the prefix
     *
     * @param {(string | commandInterface)} command command of which to create help embed of
     * @param {(string | Guild)} [guild] guild for which to create help embed for
     * @returns
     * @memberof Commands
     */
    async getHelpEmbed(commandResolvable: CommandResolvable, guildWrapperResolvable?: GuildWrapperResolvable) {
        let command = resolveCommand(commandResolvable);
        let guildWrapper = await resolveGuildWrapper(guildWrapperResolvable);
        let commandUsageLimits = await guildWrapper.getCommandUsageLimits(commandResolvable);


        let prefix = await guildWrapper.getPrefix();
        let embed = {
            color: Bot.settings.embedColors.help,
            author: {
                name: `Command: ${prefix}${command.name}`
            },
            fields: [
                {
                    name: 'Description:',
                    value: command.help.longDescription
                },
                {
                    name: 'Need to be:',
                    value: permToString(command.permLevel),
                    inline: true
                },
                {
                    name: 'DM capable:',
                    value: command.dm,
                    inline: true
                },
                {
                    name: 'Togglable:',
                    value: command.togglable,
                    inline: true
                },
                {
                    name: 'Usage:',
                    value: command.help.usages.join('\n').replace(/\{command\}/g, prefix + command.name)
                },
                {
                    name: 'Example:',
                    value: command.help.examples.join('\n').replace(/\{command\}/g, prefix + command.name)
                }
            ]
        };

        if (commandUsageLimits.globalCooldown)
            embed.fields.splice(4, 0, {
                name: 'Global Cooldown',
                value: durationToString(commandUsageLimits.globalCooldown),
                inline: true
            });
        if (commandUsageLimits.localCooldown)
            embed.fields.splice(4, 0, {
                name: 'Local Cooldown',
                value: durationToString(commandUsageLimits.localCooldown),
                inline: true
            });

        if (command.help.additionalFields)
            for (const field of command.help.additionalFields.reverse())
                // @ts-ignore
                embed.fields.splice(1, 0, field);

        return { embed };
    }

    /**
     * Merges the provided usage limits provided with those specified in the command
     *
     * @param {CommandResolvable} commandResolvable Command for which to get usage limits
     * @param {CommandUsageLimits} commandUsageLimits Usage limits to merge
     * @returns {CommandUsageLimits} Merged usage limits
     * @memberof Commands
     */
    getCommandUsageLimits(commandResolvable: CommandResolvable, commandUsageLimits: CommandUsageLimits): CommandUsageLimits {
        let command = resolveCommand(commandResolvable);

        return {
            globalCooldown: commandUsageLimits.globalCooldown || command.cooldownGlobal,
            localCooldown: commandUsageLimits.localCooldown || command.cooldownLocal,
            enabled: commandUsageLimits.enabled !== undefined ? commandUsageLimits.enabled : true
        };
    }

}