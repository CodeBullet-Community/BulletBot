import * as discord from "discord.js";
import commands from "./commands";
import filters from "./filters";
import webhooks from "./webhooks";
import utils from "./utils";


interface botInterface {
    client: discord.Client;
    commands: commands;
    filters: filters;
    webhooks: webhooks;
    utils: utils;
}
var bot:botInterface = {
    client: new discord.Client(),
    commands: new commands(),
    filters: new filters(),
    webhooks: new webhooks(),
    utils: new utils()
};
