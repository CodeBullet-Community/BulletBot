# BulletBot

This is a bot for the [Code Bullet and Co](https://discord.gg/7Z5d4HF) discord server. It was originally made to fix a webhook role mentioning problem, but the goal was extended to replacing all bots in the server. (Which it currently can't)

## Coding style

When planning a feature, keep in mind, that the bot should be stateless. AKA all data should be stored in the database, so the bot can crash or shutdown at any time and resume it's work later like before.

### General guide

As a style guide we use [this](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md) guide from basarat and his typescript book.

### Arguments in Utils and Database

All arguments in utils functions and database functions (so all functions defined in `/utils` and `/database`) should have their arguments ordered in a following way:

 1. guild / guildID
 2. user / userID
 3. member / memberID
 4. role / roleID
 5. channel / channelID
 6. message / messageID
 7. others

## How to run the bot

Jet is using Typescript 3.4.1 but any version will probably work if you use the `tsconfig.json`. The bot also needs a `bot-config.json` file in `src\` and respectively `out/`. The json structure is the following:

```JSON
{
    "version": "v1.0", //the version of the current build
    "botToken": "[bot token here]",
    "DBURI": "mongodb://localhost", // URI to mongodb cluster
    "googleAPIKey": "[google api key for youtube_v3]",
    "globalUpdateInterval": 60000,
    "callbackURL": "[callback ip address for webhook]",
    "callbackPort": 8020, // port in callback ip
    "callbackPath": "/webhooks", // results in http://[ip]:[port]/webhooks/[service]
    "youtube": {
        "logo": "https://www.android-user.de/wp-content/uploads/2018/07/icon-youtobe.png",
        "color": 16711680,
        "name": "YouTube"
    }
}
```

There also needs to be a mongoDB cluster running. The minimal data in the cluster is in database `settings` in collection `settings` there should be a document with following data.

```JSON
{  
   "prefix":"?!",
   "defaultEmbedColor":8311585,
   "helpEmbedColor":8311585,
   "botMasters":[  
      "[a bot masters user id]"
   ],
   "commands":{  
      "animal":{  
         "apis":{  
            "cat":"https://some-random-api.ml/img/cat",
            "dog":"https://some-random-api.ml/img/dog",
            "fox":"https://some-random-api.ml/img/fox",
            "panda":"https://some-random-api.ml/img/panda",
            "red-panda":"https://some-random-api.ml/img/red_panda",
            "bird":"https://some-random-api.ml/img/birb",
            "pikachu":"https://some-random-api.ml/pikachuimg"
         }
      }
   },
   "filters":{  

   }
}
```

## Logo/PFP

The logo/PFP was a fanart from @Aster#4205.

![unscaled logo](https://prod-files.lcvn.eu/file/data/ildljchl4c6jnwye44v2/PHID-FILE-quru5ggzl7xnpz3tzbn4/BulletBot-logo.png "Unscaled Logo")
![10x scaled logo](https://prod-files.lcvn.eu/file/data/4gayr3sk67l3jfvgkewk/PHID-FILE-7vasoju424ax4luexojr/BulletBot-logo_scaled.png "10x scaled Logo")