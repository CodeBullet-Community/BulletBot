# Introduction

This guide will help you set up the BulletBot on your Windows PC so you can code and test new features. It will also of course show you how to compile the bot which, if you want to have a dev release, can be helpful.

## Getting Started

### 1. Installing MongoDB And Node.js

First, you will have to install the required software to compile and run the bot. BulletBot runs on Node.js and uses a MongoDB cluster to work. Download and install both via the links below:

- Node.js: https://nodejs.org/en/download/ (newest version, MSI, x64)
- MongoDB: https://www.mongodb.com/download-center/community (newest version, MSI, x64) (installing MongoDB Compass recommended)

### 2. Install Node.js Global Packages

Now that you have Node.js you will also have to install TypeScript to be able to compile `.ts` files to `.js` files. Additionally, if you want you can download TypeDoc to build the source documentation. Open a terminal and type following commands:

- install [TypeScript](https://www.npmjs.com/package/typescript): `npm install -g typescript`
- install [TypeDoc](https://www.npmjs.com/package/typedoc) (optional): `npm install -g typedoc`

### 3. Setup Project Directory

After everything is installed it's time to start putting in the files.

#### 3.1. Folder Structure

A recommended folder structure in your project folder would be the following:

```Tree
.
├── database (location of MongoDB cluster)
├── BulletBot (repo location)
└── docs (location of docs build by TypeDoc)
```

!!! note
    The rest of this guide will assume you have this folder structure.

#### 3.2. Cloning The Repo

Clone the repo into the BulletBot directory by moving the working directory to the base and executing

```Cmd
git clone https://github.com/CodeBullet-Community/BulletBot.git
```

for the master branch or

```Cmd
git clone -b [branch name] --single-branch https://github.com/CodeBullet-Community/BulletBot.git
```

for another branch. This will create the BulletBot folder with the selected branch in it.

### 4. Installing Node.js Local Packages

Now that the BulletBot repo has been downloaded, you'll need to install the rest of the Node.js packages locally. Inside the BulletBot repo directory, execute:

```Cmd
npm install
```

### 5. Setting Up The MongoDB Cluster

In this guide, the cluster is set up without any authentication or replication. The version running on the server does have those two things and it is also highly recommended for anyone running the bot on a server, so keep this in mind while developing.

#### 5.1. Starting The Cluster

Create the `database` directory and start the MongoDB cluster using

```Cmd
mongod --port [port] --dbpath [absolute path to database dir]` (default port 27017)
```

If it can't find the command you will have to manually add it to PATH. The cluster is ready when it prints out `[initandlisten] waiting for connections` (might not be the last line it prints out). Don't kill the process as this would kill the cluster.

#### 5.2. Inserting Settings Document

BulletBot needs a settings document in the database to work. The difference between the `bot-config.json` and this document is that the settings in here can be changed while it's running and doesn't require a restart.

1. Open mongo shell: `mongo --port [port]` (default port 27017)
2. Switch to the `settings` collection: `use settings`
3. Insert the following document: `db.settings.insert([document])`
        
        :::json
        {
            "prefix": "?!",
            "embedColors": {
                "default": 8311585,
                "help": 8311585,
                "neutral": 4868682,
                "negative": 15805477,
                "warn": 16086051,
                "positive": 8311585
            },
            "botMasters": ["[user ID of bot masters]"],
            "commands": {
                "animal": {
                    "apis": {
                        "cat": "https://some-random-api.ml/img/cat",
                        "dog": "https://some-random-api.ml/img/dog",
                        "fox": "https://some-random-api.ml/img/fox",
                        "panda": "https://some-random-api.ml/img/panda",
                        "red-panda": "https://some-random-api.ml/img/red_panda",
                        "bird": "https://some-random-api.ml/img/birb",
                        "pikachu": "https://some-random-api.ml/pikachuimg"
                    }
                },
                "purge": {
                    "maxMessages": 1000
                }
            }
        }

### 6. Add Bot Config

Additionally to the settings document the bot has, as mentioned above, a `bot-config.json`. Put the following template into `BulletBot/out/bot-config.json`:

```json
{
    "version": "v[version number]",
    "botToken": "[bot token]",
    "cluster": {
        "url": "mongodb://localhost:[port]",
        "suffix": ""
    },
    "googleAPIKey": "[optional Google API key]",
    "globalUpdateInterval": 10000,
    "cleanInterval": 600000,
    "pActionsInterval": 1000,
    "YTResubInterval": 259200000,
    "crashProof": {
        "file": "../crashProof.time",
        "interval": 10000
    },
    "callback": {
        "URL": "[ip address or domain name]",
        "port": 8000,
        "path": "/webhooks"
    },
    "youtube": {
        "logo": "https://www.android-user.de/wp-content/uploads/2018/07/icon-youtobe.png",
        "color": 16711680,
        "name": "YouTube"
    }
}
```

!!! note
    * The Google API key and callback is only required when you want to use webhooks

### 7. Run Bot

#### 7.1. Compile TypeScript Code

Before running the bot you first need to compile the TypeScript code into js code. To do this open a new terminal and move into the `BulletBot` directory. Then do `tsc` and just let it run. This will start the compiler in watch mode, which means it will automatically compile changes in the TypeScript code.

#### 7.2. Running BulletBot

Now after all this setup you can finally run BulletBot by doing `node out/index.js` in the `BulletBot` directory. You should see your bot getting only and having a `I'm ready!` presence. The logs should look similar to this:

```Log
[14/09/2019 15:50:52.194] [INFO]   [database.js:Database:59]    updating global cache every 10000ms
[14/09/2019 15:50:52.198] [INFO]   [database.js:Database:67]    cleaning database every 600000ms
[14/09/2019 15:50:52.232] [LOG]    [catcher.js:Catcher.server.app.listen:21]    catcher listening to port 8000
[14/09/2019 15:50:52.236] [INFO]   [commands.js:fs.readdir:52]    loading 4 commands in out/commands/
[14/09/2019 15:50:52.239] [INFO]   [commands.js:commands.forEach:55]    1: help.js loaded!
[14/09/2019 15:50:52.240] [INFO]   [commands.js:commands.forEach:55]    2: info.js loaded!
[14/09/2019 15:50:52.242] [INFO]   [commands.js:commands.forEach:55]    3: ping.js loaded!
[14/09/2019 15:50:52.243] [INFO]   [commands.js:commands.forEach:55]    4: status.js loaded!
[14/09/2019 15:50:52.244] [INFO]   [filters.js:fs.readdir:54]    loading 1 filters in out/filters/
[14/09/2019 15:50:52.246] [INFO]   [filters.js:filters.forEach:57]    1: kappa.js loaded!
[14/09/2019 15:50:52.247] [INFO]   [commands.js:fs.readdir:52]    loading 2 commands in out/commands/Fun/
[14/09/2019 15:50:52.249] [INFO]   [commands.js:commands.forEach:55]    1: abc.js loaded!
[14/09/2019 15:50:52.253] [INFO]   [commands.js:commands.forEach:55]    2: animal.js loaded!
[14/09/2019 15:50:52.254] [INFO]   [commands.js:fs.readdir:52]    loading 7 commands in out/commands/Misc/
[14/09/2019 15:50:52.257] [INFO]   [commands.js:commands.forEach:55]    1: botsuggest.js loaded!
[14/09/2019 15:50:52.259] [INFO]   [commands.js:commands.forEach:55]    2: bug.js loaded!
[14/09/2019 15:50:52.261] [INFO]   [commands.js:commands.forEach:55]    3: channelinfo.js loaded!
[14/09/2019 15:50:52.265] [INFO]   [commands.js:commands.forEach:55]    4: lmgtfy.js loaded!
[14/09/2019 15:50:52.267] [INFO]   [commands.js:commands.forEach:55]    5: roleinfo.js loaded!
[14/09/2019 15:50:52.268] [INFO]   [commands.js:commands.forEach:55]    6: serverinfo.js loaded!
[14/09/2019 15:50:52.270] [INFO]   [commands.js:commands.forEach:55]    7: whois.js loaded!
[14/09/2019 15:50:52.271] [INFO]   [commands.js:fs.readdir:52]    loading 9 commands in out/commands/Management/
[14/09/2019 15:50:52.273] [INFO]   [commands.js:commands.forEach:55]    1: admin.js loaded!
[14/09/2019 15:50:52.275] [INFO]   [commands.js:commands.forEach:55]    2: commands.js loaded!
[14/09/2019 15:50:52.276] [INFO]   [commands.js:commands.forEach:55]    3: filters.js loaded!
[14/09/2019 15:50:52.278] [INFO]   [commands.js:commands.forEach:55]    4: immune.js loaded!
[14/09/2019 15:50:52.280] [INFO]   [commands.js:commands.forEach:55]    5: log.js loaded!
[14/09/2019 15:50:52.282] [INFO]   [commands.js:commands.forEach:55]    6: megalog.js loaded!
[14/09/2019 15:50:52.283] [INFO]   [commands.js:commands.forEach:55]    7: mod.js loaded!
[14/09/2019 15:50:52.284] [INFO]   [commands.js:commands.forEach:55]    8: prefix.js loaded!
[14/09/2019 15:50:52.286] [INFO]   [commands.js:commands.forEach:55]    9: youtube.js loaded!
[14/09/2019 15:50:52.288] [INFO]   [commands.js:fs.readdir:52]    loading 18 commands in out/commands/Moderation/
[14/09/2019 15:50:52.290] [INFO]   [commands.js:commands.forEach:55]    1: ban.js loaded!
[14/09/2019 15:50:52.292] [INFO]   [commands.js:commands.forEach:55]    2: bans.js loaded!
[14/09/2019 15:50:52.294] [INFO]   [commands.js:commands.forEach:55]    3: case.js loaded!
[14/09/2019 15:50:52.295] [INFO]   [commands.js:commands.forEach:55]    4: casedelete.js loaded!
[14/09/2019 15:50:52.297] [INFO]   [commands.js:commands.forEach:55]    5: kick.js loaded!
[14/09/2019 15:50:52.298] [INFO]   [commands.js:commands.forEach:55]    6: lock.js loaded!
[14/09/2019 15:50:52.300] [INFO]   [commands.js:commands.forEach:55]    7: locks.js loaded!
[14/09/2019 15:50:52.301] [INFO]   [commands.js:commands.forEach:55]    8: mute.js loaded!
[14/09/2019 15:50:52.303] [INFO]   [commands.js:commands.forEach:55]    9: mutes.js loaded!
[14/09/2019 15:50:52.305] [INFO]   [commands.js:commands.forEach:55]    10: purge.js loaded!
[14/09/2019 15:50:52.306] [INFO]   [commands.js:commands.forEach:55]    11: reason.js loaded!
[14/09/2019 15:50:52.308] [INFO]   [commands.js:commands.forEach:55]    12: say.js loaded!
[14/09/2019 15:50:52.309] [INFO]   [commands.js:commands.forEach:55]    13: softban.js loaded!
[14/09/2019 15:50:52.311] [INFO]   [commands.js:commands.forEach:55]    14: unban.js loaded!
[14/09/2019 15:50:52.313] [INFO]   [commands.js:commands.forEach:55]    15: unlock.js loaded!
[14/09/2019 15:50:52.314] [INFO]   [commands.js:commands.forEach:55]    16: unmute.js loaded!
[14/09/2019 15:50:52.316] [INFO]   [commands.js:commands.forEach:55]    17: warn.js loaded!
[14/09/2019 15:50:52.317] [INFO]   [commands.js:commands.forEach:55]    18: warnings.js loaded!
[14/09/2019 15:50:53.272] [LOG]    [mStats.js:null:30]       connected to /mStats database
[14/09/2019 15:50:53.279] [LOG]    [logger.js:null:29]       logger connected to /main database
[14/09/2019 15:50:53.280] [LOG]    [database.js:null:50]     connected to /settings database
[14/09/2019 15:50:53.285] [LOG]    [caseLogger.js:null:26]    caseLogger connected to /main database
[14/09/2019 15:50:53.286] [LOG]    [database.js:null:28]     connected to /main database
[14/09/2019 15:50:53.287] [LOG]    [youtube.js:null:154]     connected to /webhooks database
[14/09/2019 15:50:53.288] [LOG]    [pActions.js:null:28]     pActions connected to /main database
[14/09/2019 15:50:53.344] [INFO]   [mStats.js:init:79]       Resolved 1 days in hourly collection.
[14/09/2019 15:50:56.301] [INFO]   [index.js:client.on:117]    Adding 0 guilds and removing 0 guilds
[14/09/2019 15:50:56.302] [LOG]    [index.js:client.on:125]    I'm ready!
```

If it doesn't work check if you did everything correctly or ask in the discord server for help. If it did work then congratulations you just set up your dev environment for BulletBot. Now you can code your ideas away.

### Build docs

If you want to build the documentation with TypeDoc run the following command in the `BulletBot`  repo directory.

```Cmd
typedoc --out ..\docs\ .\src\ --tsconfig .\tsconfig.json --mode file --name BulletBot --readme .\README.md --media .\media\
```

!!! note
    * You will have to have TypeDoc installed (look in 2)
    * You will need to rebuild the documentation every time you want to update it to the new source