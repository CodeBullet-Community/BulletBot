# Commands List Readme

This readme will introduce some important/helpful information regarding BulletBot's commands.

## Required Rank

To determine whether or not a user has the necessary permissions to execute one of BulletBot's commands, each command has a required rank (or permission set) that the user must have. All the possible ranks include bot master, admin, mod, and member. Below is a description of each rank and how a user can receive them.

### Bot Master

Bot masters have no restrictions when it comes to using BulletBot. They can perform any command, no matter their server, role, or user-level permissions.

Bot masters are added when creating and applying the [settings document](https://github.com/CodeBullet-Community/BulletBot/blob/master/docs/database/settings.md) to the database. Because of this, all users added as a bot master will be recognized as such in any server that the bot is in.

### Admin

Users in the admin rank can use commands that manage the server, as well as any commands that require the mod or member rank.

People who already have the admin perms through server roles are automatically given admin rank permissions. If you want to add or remove a user or role from this rank, you can do so using `?!admin [add/rem] [mention/userID]`.

### Mod

Users in the mod rank can use commands that moderate the server, as well as those usable by the member rank.

Similar to the admin rank, you can add and remove a user or role from this rank using `?!mod [add/rem] [mention/userID]`.

### Immune

Users in the immune rank are excluded from the currently non-existent auto-moderation (which will hopefully be added in the future).

Just like the ranks above, users can be added and removed from this role via `?!immune [add/rem] [mention/userID]`.

### Member

By default, every non-admin user is apart of the member rank. Members have the most basic permissions and can't use any command requiring the bot owner, admin, or mod rank.

## IMPORTANT

Because ranks such as the bot master, admin, and mod are capable of negating server, role, and user permissions, be careful to whom you give these ranks.
