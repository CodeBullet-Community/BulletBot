import 'reflect-metadata';

import { keys } from 'ts-transformer-keys';
import { Bot, BotConfig } from './bot';
import botConfig from './bot-config.json';

// Check if source was complied correctly
try {
    keys();
} catch{
    throw new Error(`Source was not complied correctly. Use 'ttsc' as compiler so plugins also get included.`);
}

let config: BotConfig = botConfig;

// add console logging info
if (config.logMetadata)
    require('console-stamp')(console, {
        format: ':date(yyyy/mm/dd HH:MM:ss.l, true) :label'
    });

let bot = new Bot(config);
bot.init();

