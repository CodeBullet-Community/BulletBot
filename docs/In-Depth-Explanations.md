# In Depth Explanations

Here we will be looking in-depth at different aspects of BulletBot and the Installers.

This document is broken up into two parts: [Installers](#installers) and [BulletBot Modules and Code](#bulletbot-modules-and-code). The "Installers" section focuses on all the important things that the installers do. It will go in-depth about how and why it does some of the things it does. The "BulletBot Modules and Code" section explains the basic working of the different parts of BulletBot (called modules). This can help you gain a basic overview of the bot.

## Installers

As their name implies, the installers are designed for installing and setting up BulletBot. On top of this, they keep BulletBot up to date by giving users the option to download the newest release, run BulletBot in different run modes, and so on.

!!! important
    * The installers are designed to only work on Linux based systems.

### Installer Hierarchy

Many of the terms used throughout the guides, documentation, and scripts, are things such as "master installer", "sub-master installers", and "sub-installers". They refer to different types/groups of installers that perform specific tasks and execute/are executed by other installers.

#### Master Installer

The master installer (`linux-master-installer.sh`) is used for identifying and determining whether BulletBot supports the system it's running on. After confirming that the system is supported, the master installer then executes the [sub-master installer](#sub-master-installers) that corresponds to it's designed Linux Distribution.

??? info "Unsupported doesn't mean incompatible"
    Just because the master installer determines that the system is not supported, does not mean that the system is not compatible. What the master installer deems as "supported", is an [Officially Supported Linux Distribution](/Setup-Guides/Production/Linux-Prod-Setup-Guide/#officially-supported-linux-distributions). These distributions are Linux Distros that BulletBot has been tested and are confirmed to work on. So even if a system is not "officially supported", that does not mean that it won't work on that system.

#### Sub-Master Installers

The sub-master installers (`centos-rhel-installer.sh` and `debian-ubuntu-installer.sh`) perform the actual installation and setting up of BulletBot. They install all required prerequisites, assist in setting up BulletBot's config file, and starting BulletBot in different run modes.

Because BulletBot is supported on several Linux Distributions that are different in many ways, two sub-master installers had to be created to account for those differences. As the names of each sub-master installer imply, `centos-rhel-installer.sh` is used on CentOS and RHEL Linux Distros, while `debian-ubuntu-installer.sh` is used on Debian and Ubuntu Linux Distros.

#### Sub-Installers

The sub-installers refer to all the other installers/scripts and are always executed by the sub-master installers.

### BulletBot System User

One thing that the installers do immediately after running for the first time is to create a system user named `bulletbot`, along with a home directory for that user. It is in this home directory that all of BulletBot's code is stored.

There are two main reasons for the creation of this user:

1. The first and major reason is due to security. By creating `bulletbot` and having that user run services used by/for BulletBot, it is easier to track what each of them is doing. On top of that, any service ran by `bulletbot`, will only have the permissions required to perform their task (A.K.A., the principle of least privilege).
2. The second reason is that having a home directory where all of BulletBot’s code can be stored, creates a centralized location where one can always expect it to be. This also makes it easier for the end-user, as well as us, in terms of programming.

### Running BulletBot

BulletBot is run by a service called `bulletbot.service`, which is created when the installers are executed for the first time.

!!! note
    * `bulletbot.service` should never be enabled.
    * `bulletbot.service` is run by the `bulletbot` user.

BulletBot has two main methods/modes of running:

#### Run BulletBot in the background with auto-restart

This method runs BulletBot in the background of your system. If the system is restarted or shutdown, BulletBot will automatically be started upon system reboot.

This run mode is dependent on two files: a service file (`bullet-mongo-start.service`) and a bash script (`bullet-mongo-start.sh`).

##### Bash Script

The bash script makes sure that BulletBot is started correctly. A problem we ran into was that if `bulletbot.service` was enabled, BulletBot would start before the database had fully initialized. It occurred even when `bulletbot.service` was told to only start after `mongod.service` started. As a solution, we created this bash script.

After being executed by `bullet-mongo-start.service`, the script waits to make sure that `mongod.service` successfully started, then waits a little longer to give the database enough time to initialize. Once all that is done, the script will attempt to start `bulletbot.service`.

On top of everything mentioned above, this script also has the capability of sending 'BulletBot Startup Status Reports'. These are sent when BulletBot is being ran in the background with auto-restart. These reports lists whether or not BulletBot was successfully started, the exit status of essential services, and the startup logs of three services that can be used to help identify errors that might have occurred during BulletBot's startup. Though please note that for this feature to work, you need to install third party mailing software. Follow [this guide](BulletBot-Startup-Status-Reports) to help you set this feature up.

##### Service File

The purpose of the service file is to initiate the auto-restart process. It is done by having the service execute `bullet-mongo-start.sh` on system reboot.

This service is the sole decider of whether or not BulletBot is run with or without auto-restart. When the service is enabled, BulletBot will run WITH auto-restart, but if disabled, it will run WITHOUT auto-restart.

!!! note
    `bullet-mongo-start.service` is NOT run by the `bulletbot` user, because the service needs to run as the root user to allow `bullet-mongo-start.sh` to start `bulletbot.service`.

#### Run BulletBot in the background

Just like the method above, this method will start bulletbot in the background of the system, except when the system is restarted or shutdown, BulletBot will NOT be started upon system reboot.

As mentioned in the description of the [service file](#service-file), if `bullet-mongo-start.service` is disabled, the run mode will default to this one. This applies even if you specifically started BulletBot with auto-restart.

### Downloading and Updating BulletBot

Every time you download/update BulletBot, the installers will first archive all of BulletBot's code currently in `/home/bulletbot/`, to `Old_BulletBot/${date}` (${date} is the time at which BulletBot's code is archived).

Currently, the installers do not manage any of the archives it creates. This means that the number of archives it creates in `Old_BulletBot` will continue to grow and increase in size. If you would like to remove old archives, you will need to manually delete them. Each are labeled with the date at which they were created (formatted as such: Wed Apr 29 23:28:10 PDT 2020), which will make it easier identifying what archives are old and which ones are new.

## BulletBot Modules and Code

### Commands Module

This module loads and manages all commands. Its main class is located at [`src/commands.ts`](https://github.com/CodeBullet-Community/BulletBot/blob/master/src/commands.ts). Commands are stored in two different variables. One is a single array of all commands, and the other is an object structured with subcategories (`strucObject`). The subcategory names in the strucObject are all lowercase, and there is a property named `_categoryName` which holds the unmodified name of the subcategory.

#### Commands File Structure

The Commands module imports the commands based on their location in the [`commands`](https://github.com/CodeBullet-Community/BulletBot/blob/master/src/commands) directory. If they are in a subdirectory, they will be loaded into a subcategory of the subdirectories name. Because of this, the file location and subdirectory names are essential. The actual name of the file holding the command isn't crucial, as the module takes the name specified in the command object.

### Filters Module

The Filters module is build up like the Commands Module.

### MStats Module

MStats module stands for "management statistics module", which is responsible for logging statistical data about bot usage to the database. It caches all data and saves it to the database at a certain interval (every 10 seconds). Each hour (at `XX:00:01`), it creates a new hour document to save to. After a day (at `00:00:01`), it also summarizes the statistics of the last 24 hours and saves it to a day document and also adds its information to an all-time document, which is a summary of all statistical data. The hour documents of the last day will then be deleted from the database, which means the first 24 hours the stats are precise to the hour and after that only to the day. For more information about what the MStats module stores see the [database documentation](https://github.com/CodeBullet-Community/BulletBot/blob/master/docs/dev-documentation/database/mStats.md)

### PActions Module

The PActions module is responsible for saving time delayed tasks and then executing them. Its name stands for `pending Actions`. All tasks that are scheduled with this module get saved to the `main` database in the `pActions` collection. This is done to ensure that the tasks still get executed when the bot randomly crashes. If nodes native function `setTimeout` would have been used, there wouldn't have been a way to save this somewhere. The PActions module periodically checks the database for tasks that need to be executed. The interval between checks is defined by the `pActionsInterval` (in milliseconds) in the `bot-config.json` file. When a task is executed, PActions will treat the argument differently depending on the tasks action ID, which are defined in the [`schema.ts` file](https://github.com/CodeBullet-Community/BulletBot/blob/master/src/database/schemas.ts#L540)

### Webhook System

Unlike in other bots, where creating a webhook just creates a discord webhook, BulletBot directs the webhook to its server to "catch" and then manually sends a message in the channel. This is done so unmentionable Mentions can be used. The bot has one port dedicated to catching webhooks from all services (currently only YouTube). Because each service has it's own data structure when returning webhook data, each service has a custom catcher that listens on a different path. The `catcher.ts` file only is responsible for creating an express server and getting all catchers for all services.

#### YouTube Webhooks

For YouTube webhooks, the bot uses the PubSubHubbub protocol and the [hub](https://pubsubhubbub.appspot.com/subscribe) provided by Google. It only subscribes to every channel once, so if different servers have webhooks for the same channel, the bot will only subscribe the first time.

### Command Cache

Some commands require the user to reply with more information (`?!abc` as an example). To do this, BulletBot uses something called command caches. This allows a command to temporarily store data the user previously provided and also makes the bot send the reply message which doesn't have the prefix with the command to the specific command. For this to also work in DMs, the cache only stores the channel and the user ID, not the server ID. Then each time the bot receives a message, it checks if there is a command cache for that user and channel. If there is one, it will call the command as it normally would but also passes the command cache as a parameter. What the command does with that depends on the command. To check how the command cache document is build up check out the [database documentation](https://github.com/CodeBullet-Community/BulletBot/master/docs/docs/dev-documentation/database/main.md#commandcaches-collection-document).

### Rank/Permission System

BulletBot uses a very common rank system where you can add users or roles to a list of a certain rank. There are the following ranks:

- Bot Master
- Admin
- Mod
- Immune
- Member

By default, every non-admin member is a `Member` and only members with admin permissions have the `Admin` rank (without being in the `Admin` list).
In addition to the normal `Admin` and `Mod` ranks there is also the `Immune` rank which can exclude a user from currently non-existent auto-moderation and `Bot Master` which can only have users in its list and is defined in the `botMasters` property of the `bot-config.json` file. Users in that list have the the highest permission level in every server.
