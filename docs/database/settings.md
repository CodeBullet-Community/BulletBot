# settings Database Document Definitions

This file contains the definitions for all documents in all collections in the settings database. This database is kind of special in that it has only one collection with one document in it.

## settings Collection Document

only one document in collection

```Typescript
{
    prefix: string; // default prefix
    presence: PresenceData; // presence data defined in discord.js docs
    // colors of different embed colors
    embedColors: {
        default: number;
        help: number;
        neutral: number;
        bad: number;
        warn: number;
        positive: number;
    };
    botMasters: [string]; // user ids of bot masters
    // command settings
    commands: {
        // key is command name
        [key: string]: {
            [key: string]: any;
        };
    };
    // filter settings
    filters: {
        // key is filter name
        [key: string]: {
            [key: string]: any;
        };
    };
    usageLimits: UsageLimits; // defined below
}
```

## UsageLimits Object

This Object is used in the `settings` collection document and in the `guilds` collection document.

```Typescript
{
    commands?: {
        // command name
        [key: string]: {
            // both cooldowns are set in milliseconds and if they aren't set, they will use the default defined in the code
            globalCooldown?: number; // only can be set if this is in the `settings` document
            localCooldown?: number; // can be set both in `guild` and `settings` documents
            enabled?: boolean; // if command can be used
        }
    };
    cases?: {
        maxCases?: number; // max amount of cases a guild can have
        storeTime?: number; // time the bot stores the case (defined in milliseconds)
    };
    webhooks?: {
        maxWebhooks?: number; // max amount of webhooks a guild can have
        maxMessageLength?: number; // max message length a webhook can have
    };
    pActions?: {
        maxTime: number; // max time a action can be pending
    };
    megalog?: {
        disabled: [string]; // which megalog functions can't be used
    };
    logs?: {
        maxLogs?: number; // max amount of logs a guild can have
        storeTime?: number; // time the bot stores the log (defined in milliseconds)
    };
    guild?: {
        maxInactiveTime?: number; // if in the server there haven't been any human activity for a certain amount of time, the bot will automatically leave
    };
}
```
