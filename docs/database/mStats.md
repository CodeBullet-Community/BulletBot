# mStats Database Document Definitions

This file contains the definitions for all documents in all collections in the mStats database. The name of the collection is in the header. MStats is short for management statistics.

## Base Document

This document is the base of all documents in nearly all collections. Each collection adds other stuff to it, but always the same base document.

```Typescript
{
    messagesReceived: number; // all messages received
    messagesSend: number; // all messages send
    logs: number; // total logs created
    guildsJoined: number;
    guildsLeft: number;
    guildsTotal: number;
    errors: number;
    commandTotal: number; // total used
    commands: {
        // key is command name, usage data
        [key: string]: {
            _error: number; // total errors caught
            _resp: number; //response time in ms (when first reply send, so ping doesn't get counted)
            _main: number; // main command
            // subcommand like add, rem, list
            [key: string]: number;
        }
    };
    filters: {
        // key is filter name, catch data
        [key: string]: number; // number of messages filtered
    };
    webhooks: {
        // key is service name
        [key: string]: {
            total: number; // how many exist
            created: number; // number of webhooks created
            changed: number; // number of webhooks changed
            deleted: number; // number of webhooks deleted
        }
    };
    ping: {
        clientAPI: number; // client ping
        cluster: number; // cluster ping
    };
    megalog: {
        // how many times each function is enabled
        enabled: {
            channelCreate: number;
            channelDelete: number;
            channelUpdate: number;
            ban: number;
            unban: number;
            memberJoin: number;
            memberLeave: number;
            nicknameChange: number;
            memberRolesChange: number;
            guildNameChange: number;
            messageDelete: number;
            attachmentCache: number;
            messageEdit: number;
            reactionAdd: number;
            reactionRemove: number;
            roleCreate: number;
            roleDelete: number;
            roleUpdate: number;
            voiceTranfer: number;
            voiceMute: number;
            voiceDeaf: number;
        };
        // how many things each function has logged
        logged: {
            channelCreate: number;
            channelDelete: number;
            channelUpdate: number;
            ban: number;
            unban: number;
            memberJoin: number;
            memberLeave: number;
            nicknameChange: number;
            memberRolesChange: number;
            guildNameChange: number;
            messageDelete: number;
            attachmentCache: number;
            messageEdit: number;
            reactionAdd: number;
            reactionRemove: number;
            roleCreate: number;
            roleDelete: number;
            roleUpdate: number;
            voiceTranfer: number;
            voiceMute: number;
            voiceDeaf: number;
        };
    }
```

## allTime Collection Document

only has one doc with the base document as base

```Typescript
{
    from: number; // from timestamp
    to: number; // last updated
}
```

## daily Collection Document

one document for each day with the base document as base

```Typescript
{
    day: number; // timestamp 00:00 of day
}
```

## hourly Collection Document

one document for each hour of one day with the base document as base

```Typescript
{
    day: number; // timestamp 00:00 of day
    hour: number; // hour of day 0-23
}
```

## errors Collection Document

THIS COLLECTION DOES NOT USE THE BASE DOCUMENT.
One document for each error (same errors count as one error)

```Typescript
{
    first: number; // timestamp of first occurrence
    last: number; // timestamp of last occurrence
    md5: hash; // md5 hash to check if the error is the same
    count: number; // how many times it was thrown
    error: any; // error object
}
```
