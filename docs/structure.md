# Code / File / Folder Structure

This file contains a simple overview of what code for what purpose is placed where and how some of the folder structure needs to be.

```
.
├── media   - folder that contains images for BulletBot
|
├── out     - (created when TS code is compiled) output dir with js files
|
├── _src    - contains entire source code of BulletBot
|   |
|   ├── _commands   - folder with all commands
|   |   ├── [category name]     - category folder with commands
|   |   └── [command name].ts   - command template used on all newer commands
|   |
|   ├── filters     - folder with all filters (same structure as commands)
|   |
|   ├── _database   - folder containing code that directly accesses the database
|   |   ├── caseLogger.ts   - contains class that manages cases on db
|   |   ├── database.ts     - contains main simple database interface
|   |   ├── logger.ts       - contains class that logs normal server logs
|   |   ├── mStats.ts       - managment statistics module
|   |   ├── pActions.ts     - pending actions module
|   |   └── schemas.ts      - contains all document definitions for the database
|   |
|   ├── _utils      - folder containing functions used everywhere
|   |   ├── filters.ts      - contains util functions for filters
|   |   ├── messages.ts     - contains util functions related to messages
|   |   ├── parsers.ts      - contains all parser functions
|   |   ├── permissions.ts  - contains permission functions
|   |   └── time.ts         - contains util functions and definitions related to time
|   |
|   ├── bot-config.json - (put there by you) contains start config of BulletBot
|   ├── catcher.ts      - catcher for webhooks
|   ├── commands.ts     - loads and holds all commands
|   ├── filter.ts       - loads and holds all filter
|   ├── index.ts        - start bot contains main bot class
|   ├── megalogger.ts   - holds megalogger class
|   └── youtube.ts      - contains code for YouTube webhooks
|
├── package.json    - basically node.js config file
└── tsconfig.json   - TypeScript compiler config file
```
