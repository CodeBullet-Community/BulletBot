#!/bin/bash

echo "Starting bulletbot.service..."
systemctl start bulletbot.service || {
    echo "${red}Failed to start bulletbot.service${nc}"
    exit 1
}

# Waits for bulletbot.service to start
echo "Waiting 20 seconds for bulletbot.service to start"
sleep 20

# Lists out the last 20 logs in order to better identify if and when
# an error has occured during that start up of bulletbot.service
echo -e "--------Last 20 lines of logged events for" \
    "bulletbot.service---------\n$(journalctl -u bulletbot -n \
    20)\n---------End of bulletbot.service logs--------\n"

echo -e "Please check the logs above to make sure that there aren't any errors," \
    "and if there, to resolve whatever issue is causing them\n"

echo "${green}BulletBot is now running in the background${nc}"
