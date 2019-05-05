import { Message, Collection, Guild } from 'discord.js';
import * as fs from 'fs';
import { Bot } from '.';
import { CommandCache, UserWrapper } from './database/schemas';
import { permLevels } from './utils/permissions';

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
     * @type {string}
     * @memberof commandInterface
     */
    name: string;
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
     * @type {(0 | 1 | 2 | 3 | 4)}
     * @memberof commandInterface
     */
    permLevel: 0 | 1 | 2 | 3 | 4;
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
     * short desc of what command does
     *
     * @type {string}
     * @memberof commandInterface
     */
    shortHelp: string;
    /**
     * embed and long desc of what the command does and how to use it
     *
     * @param {Guild} [guild] guild to change the prefix if needed
     * @returns {Promise<any>}
     * @memberof commandInterface
     */
    embedHelp(guild?: Guild): Promise<any>;
    /**
     * function that called if someone uses the command
     *
     * @param {Message} message message that requested the command
     * @param {string} args arguments
     * @param {number} permLevel permLevel of the user that requested the command
     * @param {boolean} dm if message came from dms
     * @param {[number, number]} requestTime var for performance tracking
     * @param {CommandCache} [commandCache] optional parameter, if command was called with cache
     * @returns if command was successful. True and undefined means yes. If it yes, the cooldown gets set if a time is specified
     * @memberof commandInterface
     */
    run(message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number], commandCache?: CommandCache): Promise<boolean>;
}

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
                structureObject[f] = {}
                this.loadCommands(dir + f + '/', structureObject[f]);
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
                    var keys = props.path.split('/');
                    strucObject = this.structure;
                    for (var i = 0; i < keys.length; i++) {
                        if (!strucObject[keys[i]]) {
                            strucObject[keys[i]] = {};
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
     * @param {[number, number]} requestTime var for performance tracking
     * @returns
     * @memberof Commands
     */
    async runCommand(message: Message, args: string, command: string, permLevel: permLevels, dm: boolean, requestTime: [number, number]) {
        var cmd = this.commands.get(command);
        if (!cmd) return; // returns if it can't find the command
        if (!cmd.dm && dm) { // sends the embed help if the request is from a dm and the command doesn't support dms
            message.reply(cmd.embedHelp());
            return;
        }
        if (permLevel < cmd.permLevel && !dm) return; //  returns if the member doesn't have enough perms
        let user: UserWrapper;
        if (cmd.cooldownGlobal || cmd.cooldownLocal) {
            user = await Bot.database.getUser(message.author);
            if (user) {
                if (cmd.cooldownLocal && Date.now() < user.getCooldown((dm ? 'dm' : message.guild.id), command))
                    return;
                if (cmd.cooldownGlobal && Date.now() < user.getCooldown('global', command))
                    return;
            }
        }
        if (!dm && cmd.togglable) { // check if command is disabled if request is from a guild and the command is togglable
            var commandSettings = await Bot.database.getCommandSettings(message.guild.id, command);
            if (commandSettings && !commandSettings._enabled) return;
        }
        let output = await cmd.run(message, args, permLevel, dm, requestTime); // run command
        if (output !== false) {
            if (!user)
                user = new UserWrapper(undefined, message.author);
            if (cmd.cooldownGlobal)
                user.setCooldown('global', command, message.createdTimestamp + cmd.cooldownGlobal, false);
            if (cmd.cooldownLocal)
                user.setCooldown((dm ? 'dm' : message.guild.id), command, Date.now() + cmd.cooldownLocal, false);
            user.save();
        }
    }

    /**
     * runs command with cache
     *
     * @param {Message} message message from where the request came from
     * @param {CommandCache} commandCache command cache
     * @param {permLevels} permLevel perm level or member that send the message
     * @param {boolean} dm if message is from a dm
     * @param {[number, number]} requestTime var for performance tracking
     * @returns
     * @memberof Commands
     */
    async runCachedCommand(message: Message, commandCache: CommandCache, permLevel: permLevels, dm: boolean, requestTime: [number, number]) {
        var cmd = this.commands.get(commandCache.command);
        if (!cmd) {
            commandCache.remove();
            return;
        } // returns if it can't find the command
        if (!cmd.dm && dm) { // sends the embed help if the request is from a dm and the command doesn't support dms
            message.channel.send('This command can\'t be used in dms. The action was canceled.');
            commandCache.remove();
            return;
        }
        cmd.run(message, message.content, permLevel, dm, requestTime, commandCache); // run command
    }

    /**
     * getter for command by name
     *
     * @param {string} command command name
     * @returns
     * @memberof Commands
     */
    get(command: string) {
        return this.commands.get(command);
    }

}