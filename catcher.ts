import express = require("express");
import { bot } from ".";
import bodyParser = require("body-parser");
import xml2js = require('xml2js')
const xmlParser = new xml2js.Parser({ explicitArray: false })

export default class Catcher {
    app: express.Express;
    constructor(bot: bot, port: number) {
        this.app = express();
        this.app.use(bodyParser.text({ type: 'application/atom+xml' }))

        // youtube
        this.app.get("/webhooks/youtube", (req, res) => {
            res.status(200).send(req.query['hub.challenge']);
        })
        this.app.post("/webhooks/youtube", function (req, res) {
            xmlParser.parseString(req.body, async (error, result) => {
                if (error) {
                    res.status(422).json({ code: 'xml_parse_error', details: "Something went wrong while parsing the XML", error })
                } else {
                    var video = result.feed.entry
                    var publishUpdateDifference = Date.parse(video.updated) - Date.parse(video.published)
                    const type = (publishUpdateDifference > 60000) ? 'updated' : 'published'
                    var webhooks = await bot.database.webhookDB.youtube.find({ feed: video["yt:channelId"] }).exec();

                    const channelId = video["yt:channelId"];
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
                        channel.send(message);
                    }
                }
            })
        })

        this.app.listen(port, () => {
            console.log(`catcher listening to port ${port}`);
        });
    }
}