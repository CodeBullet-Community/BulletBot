# main Database Document Definitions

This file contains the definitions for all documents in all collections in the main database. The name of the collection is in the header.

## guilds Collection Document

one document for each guild

```Typescript
{
    guild: string; //guild id
    logChannel: string; // log channel id
    logs: []; // oldest to newest log document id
    staff: string; // staff document id
    cases: number; // total number of cases
    webhooks: {
        // key is service name
        [key: string]: string[]; // webhook id
    }
    locks: {
        // channel id
        [key: string]: {
            until ?: number;
            allowOverwrites: string[];
            neutralOverwrites: string[];
        };
    };
    // defines where commands can be used
    commandChannels:{
        mode: boolean; // false: exclude, true: include
        channels: string[];
    };
    usageLimits: UsageLimits; // defined in the `settings` database docs
}
```

## staff Collection Document

one document for each guild

```Typescript
{
    guild: string;
    admins: {
        roles: string[]; // role ids
        users: string[]; // user ids
    };
    mods: {
        roles: string[]; // role ids
        users: string[]; // user ids
    };
    immune: {
        roles: string[]; // role ids
        users: string[]; // user ids
    };
}
```

## prefix Collection Document

one document for each guild

```Typescript
{
    guild: string; // guild id
    prefix: string; // prefix
}
```

## commands Collection Document

one document for each guild

```Typescript
{
    guild: string; // guild id
    commands: {
        // key is command name
        [key: string]: {
            _enabled: boolean; // if enabled
            // allowed is the same as commandChannelRules in guild
            _allowed: [string, boolean];
            // custom settings of the command
            [key: string]: any;
        }
    }
}
```

## filters Collection Document

one document for each guild

```Typescript
{
    guild: string; // guild id
    filters: {
        // key is filter name
        [key: string]: {
            _enabled: boolean; // if enabled
            // custom settings of the filter
            [key: string]: any;
        }
    }
}
```

## logs Collection Document

one document for each log entry

```Typescript
{
    guild: string; // guild id
    action: number; // action id
    mod: string; // user id
    timestamp: number; // timestamp
    info: info; // info depending on action
}
```

### Log Actions Info

action ID -> string name

0 -> `staff` :

```Typescript
{
    type: 0 | 1; // add or remove
    rank: 'admins' | 'mods' | 'immune';
    role ?: string; // role id
    user ?: string; // user id
}
```

1 -> `webhook` :

```Typescript
{
    type: 0 | 1 | 2; // add, remove or change
    service: string; // service name
    webhookID: string; // document id
    changedChannel ?: boolean; // if channel was changed
    changedMessage ?: boolean; // if message was changed
}
```

2 -> `filter` :

```Typescript
{
    type: 0 | 1; // add, remove
    filter: string; // filter name
}
```

3 -> `command` :

```Typescript
{
    type: 0 | 1; // add, remove
    command: string; // command name
}
```

4 -> `prefix` :

```Typescript
{
    old: string; // old prefix
    new: string; // new prefix
}
```

5 -> `megalog` :

```Typescript
{
    type: 0 | 1; // add, remove
    functions: string[]; // functions that have been added or removed
    channel: string; // channel id
}
```

6 -> `megalogIgnore` :

```Typescript
{
    type: 0 | 1; // add, remove
    channel: string; // channel id
}
```

## commandCaches Collection Document

can only have one document for same channel and user

```Typescript
{
    channel: string; // channel id
    user: string; // user id
    command: string; // actual command
    cache: any; // stuff the command wants to store
    delete: number; // timestamp when to delete again
}
```

## users Collection Document

one document for each user

```Typescript
{
    user: string; // userid
    onServer: Boolean, // whether they are still present on the server
        commandCooldown: {
        // guild id, 'dm' or 'global'
        [key: string]: {
            // command name
            [key: string]: number; // timestamp until it can be used again
        };
    };
    persistentRoles: {
        // guild id
        [key: string]: string[]; // array of role ids
    }
    accessToken: string; // Discord access token
    expirationTimestamp: number; // timestamp when access expires
    states: [
        {
            hash: string; // a random string
            lastUsed: number; //  when it was last used
        }
    ]
}
```

## megalog Collection Document

one document per guild

```Typescript
{
    guild: string; // guild id
    ignoreChannels: string[]; // array of channel ids
    channelCreate: string; // channel id
    channelDelete: string; // channel id
    channelUpdate: string; // channel id
    ban: string; // channel id
    unban: string; // channel id
    memberJoin: string; // channel id
    memberLeave: string; // channel id
    nicknameChange: string; // channel id
    memberRolesChange: string; // channel id
    guildNameChange: string; // channel id
    messageDelete: string; // channel id
    attachmentCache: string; // channel id
    messageEdit: string; // channel id
    reactionAdd: string; // channel id
    reactionRemove: string; // channel id
    roleCreate: string; // channel id
    roleDelete: string; // channel id
    roleUpdate: string; // channel id
    voiceTranfer: string; // channel id
    voiceMute: string; // channel id
    voiceDeaf: string; // channel id
}
```

## cases Collection Document

one doc for each case

```Typescript
{
    guild: string; // guild id
    caseID: number; // case id
    user: string; // user id
    action: 'mute' | 'unmute' | 'kick' | 'unban' | 'softban'; // action name
    timestamp: number;
    duration: number; // optional in ms
    mod: string; // user id
    reason: string;
}
```

## pActions Collection Document

one doc for each pending action

```Typescript
{
    from: number; // when pending action was added
    to: number; // when pending action should be executed
    action: string; // mute, lockChannel, ban, resubWebhook
    info: Object;
}
```

### Pending Actions Info

`mute`:

```Typescript
{
    guild: string; // guild id
    user: string; // user id
    case: number; // case id
}
```

`ban`:

```Typescript
{
    guild: string; // guild id
    user: string; // user id
    case: number; // case id
}
```

`lockChannel`:

```Typescript
{
    guild: string; // guild id
    channel: string; // channel id
    allowOverwrites: string[]; // overwrites that where originally on allow
    neutralOverwrites: string[]; // overwrites that were originally neutral
}
```

`resubWebhook`:

```Typescript
{
    service: 'youtube'; // webhooks of which service need to be resubbed
}
```
