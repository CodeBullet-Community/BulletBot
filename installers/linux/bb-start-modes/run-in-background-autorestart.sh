#!/bin/bash

yellow=$'\033[1;33m'

clear
read -p "We will now run BulletBot in the background with auto restart on server reboot"
echo "Creating files required to run Bulletbot with auto restart..."
bash /home/bulletbot/installers/linux/autorestart/autorestart-updater.sh
echo "Changing ownership of files added to the home directory..."
chown bulletbot:admin -R *

if [[ $bullet_status = "active" ]]; then
    echo "${yellow}WARN: bulletbot.service is already running${nc}"
    echo "Skipped starting bulletbot"
    echo "${green}BulletBot is now set to run in the background with auto restart on server reboot${nc}"
    read -p "Press [Enter] to continue to main installer menu"
    exit 0
fi

echo "Starting bullebot.service..."
systemctl start bulletbot.service || {
    echo "${red}Failed to start bulletbot.service${nc}"
    exit 1
}
# Waits in order to give bulletbot.service enough time to start
echo "Waiting 20 seconds for bulletbot.service to start"
sleep 20
# Lists out the last 20 logs in order to better identify if and when
# an error has occured during that start up of bulletbot.service
echo -e "--------Last 20 lines of logged events for" \
    "bulletbot.service---------\n$(journalctl -u bulletbot -n \
    20)\n---------End of bulletbot.service logs--------\n"

echo -e "Please check the logs above to make sure that there aren't any errors," \
    "and if there, to resolve whatever issue is causing them\n"

echo "${green}BulletBot is now running in the background with auto restart on server reboot${nc}"
read -p "Press [Enter] to continue to main installer menu"
