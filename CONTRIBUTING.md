# Contributing

When contributing to this repository, please select a task/feature from the project of your choice. If you want to add a new feature you can create a new issue and add it to the project. Same goes with bugs. Most contributors will probably be active in the [Code Bullet and Co](https://discord.gg/4dsf8ZY) Discord server, so maybe consider joining it.

Please note we have a [code of conduct](CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

## Planning

While planning a feature, keep in mind, that the bot should be stateless. Meaning all data should be stored in the database, so the bot can crash or shutdown at any time and resume it's work later like before with no data loss. Of course you will also have to make sure that the bot will clean unused data from the database for example when he leaves a server.

It's also **highly recommended** to plan before making a feature and then also discussing the plan with the repo maintainers to ensure that it won't interfere with other features. If this step isn't done it could result in a reject of the pull request because it's either messy code or the way it uses the database isn't compatible/accepted.

## Coding Style

As a style guide we use [this](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md) guide from [basarat](https://github.com/basarat) and his typescript book.

### Arguments in Utils and Database

All arguments in utils functions and database functions (so all functions defined in `/src/utils` and `/src/database`) should have their arguments ordered in a following way:

1. guild / guildID
2. user / userID
3. member / memberID
4. role / roleID
5. channel / channelID
6. message / messageID
7. others Arguments the function needs

## Pull Request Process

1. Ensure that the code is commented and clean so that the people reviewing it or later working with it will understand what it does.
2. Update the documentation (especially the database documentation) with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

Note: The version number will be changed by one of the repo maintainers before or after the merge.
