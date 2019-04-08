import { Collection, Message } from "discord.js";
import * as fs from "fs";
import { botInterface } from ".";

export interface commandInterface {
    name: string;
    path: string;
    permissionLevel: 0 | 1 | 2 | 3
    shortHelp: string;
    embedHelp: (bot: botInterface) => void;
    run: (bot: botInterface, message: Message, args: string, permissionLevel: number) => Promise<void>;
}

export default class Commands {
    commands: Collection<string, commandInterface>;
    structure: Object;
    constructor(dir: string) {
        this.commands = new Collection();
        this.structure = {};
        this.loadCommands(dir, this.structure);
    }

    loadCommands(dir: string, structureObject: Object) {
        fs.readdir(dir, (err, files) => {
            if (err) console.error(err);

            var folders = files.filter(f => fs.lstatSync(dir + f).isDirectory());
            folders.forEach((f, i) => {
                structureObject[f] = {}
                this.loadCommands(dir + f + "/",structureObject[f]);
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
                structureObject[props.name] = props;
            });
        });
    }

    runCommand(bot: botInterface, message: Message, args: string, command: string, permissionLevel: number) {
        var cmd = this.commands.get(command);
        if (!cmd) return;
        if (permissionLevel < cmd.permissionLevel) return;
        cmd.run(bot, message, args, permissionLevel);
    }

    get(command: string) {
        return this.commands.get(command);
    }

}