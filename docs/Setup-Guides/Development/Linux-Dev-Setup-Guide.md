# Linux Development Setup Guide

This guide is meant for those who want to do the development work on BulletBot, or wish to set BulletBot up manually. It will instruct and explain the process in which BulletBot is manually set up on a Linux based distribution

!!! important "Important Note Before Continuing"
    Some of the contents of this setup guide are only applicable to BulletBot [v1.2.8](https://github.com/CodeBullet-Community/BulletBot/releases/tag/v1.2.8) and later. Due to improper writing/handling of past documentation, there is no proper documentation that can be referred to for versions older than v1.2.8.

## Officially Supported Linux Distributions

Below is a list of Linux Distributions that BulletBot is officially supported on. It also lists what versions of MongoDB and Node.js, along with other system specifications that are supported on specific distributions:

| Distro        | MongoDB Support        | Node\.js Support | Architecture |
|---------------|------------------------|------------------|--------------|
| Ubuntu 16\.04 | 3\.4, 3\.6, 4\.0, 4\.2 | 8\.x\-13\.x      | 64 bit<br>- \(ARM64 not supported\) |
| Ubuntu 18\.04 | 4\.0, 4\.2             | 8\.x\-13\.x      | 64 bit       |
| Debian 9      | 4\.0, 4\.2             | 8\.x\-13\.x      | 64 bit       |
| Debian 10     | 4\.2\.1\+              | 8\.x\-13\.x      | 64 bit       |
| RHEL 7        | 3\.4, 3\.6, 4\.0, 4\.2 | 8\.x\-13\.x      | 64 bit       |
| RHEL 8        | 4\.2\.1\+              | 8\.x\-13\.x      | 64 bit       |
| CentOS 7      | 3\.4, 3\.6, 4\.0, 4\.2 | 8\.x\-13\.x      | 64 bit       |
| CentOS 8      | 4\.2\.1\+              | 8\.x\-13\.x      | 64 bit       |

For more information on supported platforms specific to MongoDB and Node.js, visit:

* MongoDB: <https://docs.mongodb.com/manual/installation/#supported-platforms>
* Node.js: <https://github.com/nodesource/distributions/blob/master/README.md>

## Getting Started

### 1. Installing MongoDB And Node.js

First, you will have to install the required software to compile and run the bot. BulletBot runs on Node.js and uses a MongoDB cluster to work. Download and install both via the links below:

* Node.js (Recommended version: 13.x):
  * Download and install via a package manager: <https://github.com/nodesource/distributions/blob/master/README.md>
* MongoDB (Recommended: version 4.2.x):
  * Download and install guide: <https://docs.mongodb.com/manual/administration/install-on-linux/>
  * Note: Do not start or enable `mongod.service`, after MongoDB has been installed.

It is recommended to install [MongoDB Compass](https://docs.mongodb.com/compass/master/install/) alongside MongoDB, as it can make connecting to the database easier. For instructions on how to use/setup MongoDB Compass, follow [this guide](/Helpful-Guides/MongoDB-Compass/).

### 2. Install Node.js Global Packages

Now that Node.js is installed, you'll need to install TypeScript, which is used to compile `.ts` to `.js`. Additionally, you can download TypeDoc to build the source documentation.

Execute the following commands to:

* install [TypeScript](https://www.npmjs.com/package/typescript): `sudo npm install -g typescript`
* install [TypeDoc](https://www.npmjs.com/package/typedoc) (optional): `sudo npm install -g typedoc`

### 3. Setting Up Project Directory

After everything is installed, it's time to start adding the necessary files and folders.

#### 3.1. Folder Structure

Below is the recommended folder structure for your project folder:

```tree
.
├── database (location of MongoDB cluster)
├── BulletBot (repo location)
└── docs (location of docs build by TypeDoc)
```

!!! note
    * The rest of this guide will assume you are using this folder structure.
    * You are not expected to create these folders right now. The guide will tell you when you will need to create them. (The BulletBot directory is created when the repo is cloned)

#### 3.2. Cloning The Repo

Clone the repo into your project directory by executing:

```bash
git clone https://github.com/CodeBullet-Community/BulletBot
```

If you rather clone a specific branch in the repository, execute:

```bash
git clone -b [branch name] --single-branch https://github.com/CodeBullet-Community/BulletBot
```

* Replace `[branch name]` with the name of the branch you want to clone.

### 4. Installing Node.js Local Packages

Now that the BulletBot repo has been downloaded, you'll need to install the rest of the Node.js packages locally. Inside the BulletBot repo directory, execute:

```bash
npm install
```

### 5. Setting Up The MongoDB Cluster

In this guide, the cluster is set up without any authentication or replication. For people who are running BulletBot on a public discord server or outside of the development environment, it is highly recommended to add authentication.

#### 5.1. Starting The Cluster

Create the database directory in your project folder and in a new terminal (window), start the MongoDB cluster using.

```bash
mongod --port [port] --dbpath [absolute path to database dir]
```

!!! note
    * Default port is 27017
    * This command only start mongod.service in the current session. This means that you will have to run this command every time before you try to run BulletBot.
    * If mongod.service has already been started, this command will not work. Stop the service by executing `sudo systemctl stop mongod.service`.
    * If the command can't be found, you will have to add it to PATH manually. The cluster is ready when it prints out `[initandlisten]` waiting for connections (might not be the last line it prints out). Don't kill the process as this would kill the cluster.

#### 5.2. Inserting Settings Document

BulletBot needs a settings document placed in the database to work. This document is similar to `bot-config.json`, but whereas the JSON file requires BulletBot to be a restart for any changes to be applied, changes to the settings document take immediate effect.

Before adding the document, make sure to add your Discord user ID to the `botMasters` field. The ID should be a long string of numbers similar to `516213540576277819`.

Follow the instructions below to add the settings document to the MongoDB database:

1. Open the mongo shell: `mongo --port [port]`
2. Switch to the `settings` collection: `use settings`
3. Insert the following document:

        :::json
        db.settings.insert(
        {
            "prefix": "?!",
            "presence": {
                "status":"online",
                "game": {
                    "name":"?!help",
                    "type":"Playing"
                }
            },
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
        )

      * Something similar to `WriteResult({ "nInserted" : 1 })` will be printed to the screen if the settings were successfully added to the database.

4. Exit the mongo shell: `exit`

### 6. Adding BulletBot Config File

In addition to the settings document, as mentioned above, a `bot-config.json` file needs to be created.

First and foremost, if you haven't already [created an application/bot](/Helpful-Guides/Creating-&-Inviting-A-Bot/#creating-a-discord-application), do so now. You'll need the bot key that is generated when setting up BulletBot's config file. Once you have done this, you can continue and set up the config file.

We will want to put the following template into `BulletBot/out/bot-config.json` (if the code is already compiled) or `BulletBot/src/bot-config.json` (if the code has not been compiled):

```json
{
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
        "file": "/home/bulletbot/crashProof.time",
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

After placing the template into `bot-config.json`, replace `[bot token]` with the bot's token and `[port]` with the port number that MongoDB will run on (default is 27017).

!!! note
    * The Google API key is only required if you want to use commands that require access to Google services.
    * The callback is only needed when you want to use webhooks.

### 7. Compile Code & Running BulletBot

#### 7.1. Compile TypeScript Code

Before running BulletBot, you first need to compile the TypeScript code into JavaScript code. To do this, open a new terminal (window), then execute `tsc` in the `BulletBot` directory. This will start the compiler in watch mode, which means it will automatically compile changes in the code.

#### 7.2. Running BulletBot

After all the code has compiled into JavaScript, you can now run BulletBot in your current session by executing `node out/index.js` in the `BulletBot` directory. You'll see information printed to the screen, displaying logs on BulletBot's startup. The logs should look similar to this:

```log
[24/10/2019 01:16:15.109] [INFO]   [commands.js:null:52]     loading 4 commands in out/commands/
[24/10/2019 01:16:15.111] [INFO]   [commands.js:null:55]     1: help.js loaded!
[24/10/2019 01:16:15.113] [INFO]   [commands.js:null:55]     2: info.js loaded!
[24/10/2019 01:16:15.115] [INFO]   [commands.js:null:55]     3: ping.js loaded!
[24/10/2019 01:16:15.116] [INFO]   [commands.js:null:55]     4: status.js loaded!
[24/10/2019 01:16:15.117] [INFO]   [filters.js:null:54]      loading 1 filters in out/filters/
[24/10/2019 01:16:15.118] [INFO]   [filters.js:null:57]      1: kappa.js loaded!
[24/10/2019 01:16:15.119] [INFO]   [commands.js:null:52]     loading 2 commands in out/commands/Fun/
[24/10/2019 01:16:15.122] [INFO]   [commands.js:null:55]     1: abc.js loaded!
[24/10/2019 01:16:15.125] [INFO]   [commands.js:null:55]     2: animal.js loaded!
[24/10/2019 01:16:15.126] [INFO]   [commands.js:null:52]     loading 9 commands in out/commands/Management/
[24/10/2019 01:16:15.127] [INFO]   [commands.js:null:55]     1: admin.js loaded!
[24/10/2019 01:16:15.128] [INFO]   [commands.js:null:55]     2: commands.js loaded!
[24/10/2019 01:16:15.130] [INFO]   [commands.js:null:55]     3: filters.js loaded!
[24/10/2019 01:16:15.131] [INFO]   [commands.js:null:55]     4: immune.js loaded!
[24/10/2019 01:16:15.132] [INFO]   [commands.js:null:55]     5: log.js loaded!
[24/10/2019 01:16:15.133] [INFO]   [commands.js:null:55]     6: megalog.js loaded!
[24/10/2019 01:16:15.135] [INFO]   [commands.js:null:55]     7: mod.js loaded!
[24/10/2019 01:16:15.136] [INFO]   [commands.js:null:55]     8: prefix.js loaded!
[24/10/2019 01:16:15.144] [INFO]   [commands.js:null:55]     9: youtube.js loaded!
[24/10/2019 01:16:15.144] [INFO]   [commands.js:null:52]     loading 7 commands in out/commands/Misc/
[24/10/2019 01:16:15.146] [INFO]   [commands.js:null:55]     1: botsuggest.js loaded!
[24/10/2019 01:16:15.147] [INFO]   [commands.js:null:55]     2: bug.js loaded!
[24/10/2019 01:16:15.148] [INFO]   [commands.js:null:55]     3: channelinfo.js loaded!
[24/10/2019 01:16:15.153] [INFO]   [commands.js:null:55]     4: lmgtfy.js loaded!
[24/10/2019 01:16:15.154] [INFO]   [commands.js:null:55]     5: roleinfo.js loaded!
[24/10/2019 01:16:15.155] [INFO]   [commands.js:null:55]     6: serverinfo.js loaded!
[24/10/2019 01:16:15.156] [INFO]   [commands.js:null:55]     7: whois.js loaded!
[24/10/2019 01:16:15.157] [INFO]   [commands.js:null:52]     loading 18 commands in out/commands/Moderation/
[24/10/2019 01:16:15.158] [INFO]   [commands.js:null:55]     1: ban.js loaded!
[24/10/2019 01:16:15.159] [INFO]   [commands.js:null:55]     2: bans.js loaded!
[24/10/2019 01:16:15.160] [INFO]   [commands.js:null:55]     3: case.js loaded!
[24/10/2019 01:16:15.162] [INFO]   [commands.js:null:55]     4: casedelete.js loaded!
[24/10/2019 01:16:15.163] [INFO]   [commands.js:null:55]     5: kick.js loaded!
[24/10/2019 01:16:15.166] [INFO]   [commands.js:null:55]     6: lock.js loaded!
[24/10/2019 01:16:15.169] [INFO]   [commands.js:null:55]     7: locks.js loaded!
[24/10/2019 01:16:15.171] [INFO]   [commands.js:null:55]     8: mute.js loaded!
[24/10/2019 01:16:15.172] [INFO]   [commands.js:null:55]     9: mutes.js loaded!
[24/10/2019 01:16:15.173] [INFO]   [commands.js:null:55]     10: purge.js loaded!
[24/10/2019 01:16:15.174] [INFO]   [commands.js:null:55]     11: reason.js loaded!
[24/10/2019 01:16:15.176] [INFO]   [commands.js:null:55]     12: say.js loaded!
[24/10/2019 01:16:15.177] [INFO]   [commands.js:null:55]     13: softban.js loaded!
[24/10/2019 01:16:15.179] [INFO]   [commands.js:null:55]     14: unban.js loaded!
[24/10/2019 01:16:15.180] [INFO]   [commands.js:null:55]     15: unlock.js loaded!
[24/10/2019 01:16:15.181] [INFO]   [commands.js:null:55]     16: unmute.js loaded!
[24/10/2019 01:16:15.185] [INFO]   [commands.js:null:55]     17: warn.js loaded!
[24/10/2019 01:16:15.186] [INFO]   [commands.js:null:55]     18: warnings.js loaded!
[24/10/2019 01:16:15.203] [LOG]    [database.js:null:28]     connected to /main database
[24/10/2019 01:16:15.219] [INFO]   [database.js:null:50]     cleaning database every 600000ms
[24/10/2019 01:16:15.220] [LOG]    [mStats.js:null:30]       connected to /mStats database
[24/10/2019 01:16:15.235] [LOG]    [logger.js:null:29]       logger connected to /main database
[24/10/2019 01:16:15.236] [LOG]    [database.js:null:58]     connected to /settings database
[24/10/2019 01:16:15.237] [INFO]   [database.js:null:66]     updating global cache every 10000ms
[24/10/2019 01:16:15.243] [LOG]    [youtube.js:null:156]     connected to /webhooks database
[24/10/2019 01:16:15.244] [LOG]    [pActions.js:null:28]     pActions connected to /main database
[24/10/2019 01:16:15.245] [LOG]    [caseLogger.js:null:26]    caseLogger connected to /main database
[24/10/2019 01:16:15.248] [INFO]   [mStats.js:init:79]       Resolved 0 days in hourly collection.
[24/10/2019 01:16:15.259] [INFO]   [mStats.js:init:99]       Using existing hour document
[24/10/2019 01:16:17.542] [INFO]   [index.js:null:119]       Adding 0 guilds and removing 0 guilds
[24/10/2019 01:16:17.543] [LOG]    [index.js:null:127]       I'm ready!
```

If it doesn't work, check that you did everything correctly or ask for help in the BulletBot Discord server. If it did work, congratulations, you just set up your BulletBot dev environment. Now you can code and test your ideas.

### Build Docs

If you want to build the documentation with TypeDoc, create a directory called `docs` in the project directory, then run the following command in the `BulletBot` repo directory:

```bash
typedoc --out ../docs/ ./src/ --tsconfig ./tsconfig.json --mode file --name BulletBot --readme ./README.md --media ./media/
```

!!! note
    * You will have to have TypeDoc installed (refer to step 2).
    * You will need to rebuild the documentation every time you want to update it to the new source.
