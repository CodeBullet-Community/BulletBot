# webhooks Database Document Definitions

This file contains the definitions for all documents in all collections in the webhooks database. Each service that BulletBot has webhooks from has its own collection (right now only `youtube`).

## youtube Collection Document

one document per webhook

```Typescript
{
    feed: string; // youtube channel id
    guild: string; // guild id
    channel: string; // channel id
    message: string; // message
}
```
