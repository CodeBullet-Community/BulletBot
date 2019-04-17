import express = require("express");
import { bot } from ".";
import bodyParser = require("body-parser");
import xml2js = require('xml2js')
import { sendMentionMessage } from "./utils/messages";
import { Server } from "http";
const xmlParser = new xml2js.Parser({ explicitArray: false })

export default class Catcher {
    server: Server;
    constructor(bot: bot, port: number) {
        var app = express();
        app.use(bodyParser.text({ type: 'application/atom+xml' }))

        // youtube
        app.get("/webhooks/youtube", (req, res) => {
            res.status(200).send(req.query['hub.challenge']);
        })
        app.post("/webhooks/youtube", function (req, res) {
            xmlParser.parseString(req.body, async (error, result) => {
                if (error) {
                    res.status(422).json({ code: 'xml_parse_error', details: "Something went wrong while parsing the XML", error })
                } else {
                    var video = result.feed.entry
                    var publishUpdateDifference = Date.parse(video.updated) - Date.parse(video.published)
                    const type = (publishUpdateDifference > 300000) ? 'updated' : 'published'
                    if(type != "published") return;
                    var webhooks = await bot.database.webhookDB.youtube.find({ feed: video["yt:channelId"] }).exec();
                    if(webhooks.length == 0){
                        res.sendStatus(404);
                        return;
                    }

                    const channelLink = video.author.uri;
                    const channelName = video.author.name;
                    const link = "https://youtu.be/" + video["yt:videoId"];
                    const title = video.title;

                    for (const webhook of webhooks) {
                        const webhookObject = webhook.toObject();
                        var guild = bot.client.guilds.get(webhookObject.guild);
                        if (!guild) {
                            console.warn("in youtube catcher guild " + webhookObject.guild + " wasn't found");
                            webhook.remove();
                        }
                        var channel = guild.channels.get(webhookObject.channel);
                        if (!channel) webhook.remove();
                        var message: string = webhookObject.message;
                        message = message.replace("{{link}}", link).replace("{{title}}", title).replace("{{channelName}}", channelName).replace("{{channelLink}}", channelLink);
                        if (message.includes("{{role:")) {
                            sendMentionMessage(guild,channel,message);
                        } else {
                            channel.send(message);
                        }
                    }
                    res.sendStatus(200);
                }
            })
        })

        this.server = app.listen(port, () => {
            console.log(`catcher listening to port ${port}`);
        });
    }

    close(){
        this.server.close();
    }
}