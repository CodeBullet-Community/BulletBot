# Creating and Inviting A Discord Application

## Creating A Discord Application

![Create a Discord Application](../media/Creating-Discord-App.gif)

- Navigate to the [discord developer portal](https://discordapp.com/developers/applications/) and log into your Discord account.
- Create a new application by clicking the "New Application" button at the top right of your window.
- Give your application a name, then press "Create".
- Click on the "Bot" tab in the settings category on the left of your screen.
- Press the "Add Bot" button, located on the right side of your screen.
- Press "Yes, do it!" to finalize the creation of your bot.

## Inviting An Application To Your Discord Server

If you haven't already created an application/bot, follow the steps listed above in [Creating A Discord Application](#creating-a-discord-application)

![Inviting a Discord Application](../media/Inviting-Discord-App.gif)

- If you aren't already at the discord developer portal, make your way [there now](https://discordapp.com/developers/applications/).
- Click on an existing application.
- On the "General Information" tab, copy your Client ID.
- Replace the 12345678 in this link: `https://discordapp.com/oauth2/authorize?client_id=12345678&scope=bot&permissions=66186303` with your Client ID.
  - The link should now look similar to this: `https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=600042638`
- Copy and paste the URL that you just created into the search bar of your web browser and press [Enter].
- Select a server you want to add the bot to, then press the "Authorize" button to confirm the invite.
- Successfully perform the captcha.
- The bot should have been added to your server.
