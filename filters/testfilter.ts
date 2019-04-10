import Filters, { filter as filterInterface, filterOutput } from "../filters";
import { bot } from "..";
import { Message, Guild } from "discord.js";
import { ACTION_SEND, ACTION_DELETE, createFilterReport } from "../utils/filters";

var filter: filterInterface = { name: null, path: null, active: null, shortHelp: null, embedHelp: null, run: null }

filter.run = async (bot: bot, message: Message) => {
    if (message.content == "swearword") {
        var output: filterOutput = { report: null, actions: null };
        output.actions = [{ type: ACTION_SEND, message: "don't say that you cunt" }, { type: ACTION_DELETE, delay: 0 }];
        output.report = createFilterReport(bot, message, filter, "contained `swearword`", output.actions);
        return output;
    }
    return null;
}

filter.name = "badwords";
filter.path = "";
filter.active = async (bot: bot, guild: Guild) => {
    var filterSettings = await bot.database.getFilterSettings(guild, filter.name);
    if (!filterSettings) return false;
    if (!filterSettings.active) return false;
    return filterSettings.active;
}
filter.shortHelp = "filters swearwords";
filter.embedHelp = function (bot: bot) {
    return {
        "embed": {
            "color": bot.database.getGlobalSettings().helpEmbedColor,
            "author": {
                "name": "Filter: " + filter.name
            },
            "fields": [
                {
                    "name": "Description:",
                    "value": "filters general bad words"
                },
                {
                    "name": "Blacklist:",
                    "value": "swearword"
                }
            ]
        }
    }
};

export default filter;