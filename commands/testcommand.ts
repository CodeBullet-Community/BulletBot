import { BOTMASTER } from "../utils/permissions";
import { botInterface } from "..";
import utils from "../utils";
import { Message } from "discord.js";
import { commandInterface } from "../commands";

var command: commandInterface = { name: null, path: null, permissionLevel: null, shortHelp: null, embedHelp: null, run: null };

command.run = async (bot: botInterface, message: Message, args: string, permissionLevel: number) => {
    message.channel.send("command worked args: "+args);
    message.channel.send("you are a "+utils.permissions.permToString(permissionLevel));
}

command.name = "testcommand";
command.path = "";
command.permissionLevel = BOTMASTER;
command.shortHelp = "this is a test command";
command.embedHelp = function (bot: botInterface) {
    return {
        "embed": {
            "color": bot.database.getGlobalSettings().helpEmbedColor,
            "author": {
                "name": "Command: " + bot.database.getPrefix() + command.name
            },
            "fields": [
                {
                    "name": "Description:",
                    "value": "[Description]"
                },
                {
                    "name": "Need to be:",
                    "value": utils.permissions.permToString(command.permissionLevel)
                },
                {
                    "name": "Usage:",
                    "value": "{command} [arg] [arg]\nnew line".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                },
                {
                    "name": "Example:",
                    "value": "{command} @here #general\nnew line".replace(/\{command\}/g, bot.database.getPrefix() + command.name)
                }
            ]
        }
    }
};

export default command;