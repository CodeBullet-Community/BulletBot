import { Channel, GuildChannel, TextChannel } from "discord.js";
import { Bot } from ".";

export async function logChannelToggle(channel: GuildChannel, created: boolean) {
    let megalogDoc = await Bot.database.findMegalogDoc(channel.guild.id);
    if (!megalogDoc) return;
    if (!megalogDoc.channelCreate && created) return;
    if (!megalogDoc.channelDelete && !created) return;
    let logChannel = channel.guild.channels.get(created ? megalogDoc.toObject().channelCreate : megalogDoc.toObject().channelDelete);
    if (!logChannel || !(logChannel instanceof TextChannel)) return;
    logChannel.send({
        "embed": {
            "description": `**Channel ${created ? 'Created' : 'Deleted'}: ${created ? channel.toString() : '#' + channel.name}**`,
            "color": Bot.database.settingsDB.cache.defaultEmbedColor,
            "timestamp": new Date().toISOString(),
            "footer": {
                "text": "ID: " + channel.id
            },
            "author": {
                "name": channel.guild.name,
                "icon_url": channel.guild.iconURL
            }
        }
    });
}