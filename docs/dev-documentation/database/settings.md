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
        }
    }
}
```
