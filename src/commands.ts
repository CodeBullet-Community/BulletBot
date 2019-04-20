import { Message, Collection, Guild } from "discord.js";
import * as fs from "fs";
import { Bot } from ".";

export interface commandInterface {
    name: string;
    path: string;
    dm: boolean;
    permLevel: 0 | 1 | 2 | 3 | 4;
    togglable: boolean;
    shortHelp: string;
    embedHelp: (guild?: Guild) => Promise<any>;
    run: (message: Message, args: string, permLevel: number, dm: boolean, requestTimestamp: number) => Promise<void>;
}

export class Commands {
    commands: Collection<string, commandInterface>;
    structure: any;

    constructor(dir: string) {
        this.commands = new Collection();
        this.structure = {};
        this.loadCommands(dir, this.structure);
    }

    /**
     * loads commands in specific folder
     *
     * @param {string} dir
     * @param {*} structureObject
     * @memberof Commands
     */
    loadCommands(dir: string, structureObject: any) {
        fs.readdir(dir, (err, files) => {
            if (err) {
                Bot.mStats.logError();
                console.error(err);
            }

            var folders = files.filter(f => fs.lstatSync(dir + f).isDirectory());
            folders.forEach((f, i) => {
                structureObject[f] = {}
                this.loadCommands(dir + f + "/", structureObject[f]);
            });

            var commands = files.filter(f => f.split(".").pop() == "js");
            if (commands.length <= 0) {
                console.error("no commands to load in " + dir);
                return;
            }
            console.info(`loading ${commands.length} commands in ${dir}`);
            commands.forEach((f, i) => {
                var props = require(dir + f).default;
                console.info(`${i + 1}: ${f} loaded!`);
                this.commands.set(props.name, props);
                // puts command in structure
                var strucObject = structureObject;
                if (props.path != "") {
                    var keys = props.path.split("/");
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
     * @param {Message} message
     * @param {string} args
     * @param {string} command
     * @param {number} permLevel
     * @param {boolean} dm
     * @returns
     * @memberof Commands
     */
    async runCommand(message: Message, args: string, command: string, permLevel: number, dm: boolean, requestTimestamp: number) {
        var cmd = this.commands.get(command);
        if (!cmd) return;
        if (!cmd.dm && dm) {
            message.reply(cmd.embedHelp());
            return;
        }
        if (permLevel < cmd.permLevel && !dm) return;
        if (!dm) {
            var commandSettings = await Bot.database.getCommandSettings(message.guild.id, command);
            if (commandSettings && !commandSettings._enabled) return;
        }
        cmd.run(message, args, permLevel, dm, requestTimestamp);
    }

    /**
     * returns command with specified name
     *
     * @param {string} name
     * @returns
     * @memberof Commands
     */
    get(name: string) {
        return this.commands.get(name);
    }

}