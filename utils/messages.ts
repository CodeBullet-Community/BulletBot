import { bot } from "..";
import { Guild } from "discord.js";

/** send log to logChannel if defined */
export async function sendLog(bot:bot, guild:Guild, log: any){
    var logChannel:any = await bot.database.findGuildDoc(guild);
    if(!logChannel){
        console.warn("sendLog: guildDoc not found");
        return;
    }
    logChannel = logChannel.toObject().logChannel;
    if(logChannel){
        guild.channels.get(logChannel).send(log);
    }
}