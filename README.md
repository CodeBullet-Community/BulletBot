# BulletBot

This is a bot for the [Code Bullet and Co](https://discord.gg/7Z5d4HF) discord server. It was originally made to fix a webhook role mentioning problem, but the goal was extended to replacing all bots in the server. (Which it currently can't)

## Coding style

### General guide

As a style guide we use [this](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md) guid from basarat and his typescript book.

### Arguments in Utils and Database

All arguments in utils functions and database functions (so all functions defined in `/utils` and `/database`) should have their arguments ordered in a following way:

 1. guild / guildID
 2. user / userID
 3. member / memberID
 4. role / roleID
 5. channel / channelID
 6. message / messageID
 7. others

## Logo/PFP

The logo/PFP was a fanart from @Aster#4205.

![alt text](BulletBot-logo.png "Unscaled Logo")
![alt text](BulletBot-logo%20scaled.png "10x scaled Logo")