#!/bin/bash

yellow=$'\033[1;33m'
timer=20

clear
read -p "We will now run Bulletbot in the background"

if [[ $start_script_exists -eq 0 || $start_service_exists -eq 0 ]]; then
    echo "Removing file(s) used to run BulletBot with auto restart..."
    rm /home/bulletbot/bullet-mongo-start.sh 2>/dev/null
    rm /lib/systemd/system/bullet-mongo-start.sh 2>/dev/null
fi

if [[ $bullet_status = "active" ]]; then
    echo "${yellow}WARN: bulletbot.service is already running${nc}"
    echo -e "Skipped starting bulletbot\n"
    echo "${green}BulletBot is now set to run in the background${nc}"
    read -p "Press [Enter] to continue to main installer menu"
    exit 0
fi

echo "Starting bullebot.service..."
systemctl start bulletbot.service || {
    echo "${red}Failed to start bulletbot.service${nc}" >&2
    echo -e "\nExiting..."
    exit 1
}
# Waits in order to give bulletbot.service enough time to start
echo "Waiting 20 seconds for bulletbot.service to start..."
while (($timer >= 0)); do
    echo -en "\r$timer seconds left"
    sleep 1
    ((timer-=1))
done
# Lists out the last 20 logs in order to better identify if and when
# an error has occured during that start up of bulletbot.service
echo -e "\n\n--------Last 20 lines of logged events for" \
    "bulletbot.service---------\n$(journalctl -u bulletbot -n 20)" \
    "\n---------End of bulletbot.service logs--------\n"

echo -e "Please check the logs above to make sure that there aren't any" \
    "errors, and if there are, to resolve whatever issue is causing them\n"

echo "${green}BulletBot is now running in the background${nc}"
read -p "Press [Enter] to continue to the master installer menu"
