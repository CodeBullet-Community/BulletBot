#!/bin/bash

timer=20

clear
read -p "We will now run BulletBot in the background. Press [Enter] to begin."

# Both variables are exported from the master installer
if [[ -f $start_script_exists || -f $start_service_exists ]]; then
    echo "Removing file(s) used to run BulletBot with auto restart..."
    rm /home/bulletbot/bullet-mongo-start.sh 2>/dev/null
    rm /lib/systemd/system/bullet-mongo-start.service 2>/dev/null
    # Reloads systemd daemon's to account for the deleted service
    systemctl daemon-reload
fi

# 'bullet_status' exported from the master installer
if [[ $bullet_status = "active" ]]; then
    echo "Restarting bulletbot.service..."
    systemctl restart bulletbot.service || {
        echo "${red}Failed to restart bulletbot.service${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    }
    echo "Waiting 20 seconds for bulletbot.service to restart..."
else
    echo "Starting bullebot.service..."
    systemctl start bulletbot.service || {
        echo "${red}Failed to start bulletbot.service${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    }
    echo "Waiting 20 seconds for bulletbot.service to start..."
fi

# Waits in order to give bulletbot.service enough time to (re)start
while (($timer > 0)); do
    echo -en "\r$timer seconds left"
    sleep 1
    ((timer-=1))
done

# Lists the last 20 logs in order to better identify if and when
# an error occurred during the start-up of bulletbot.service
echo -e "\n\n--------Last 20 lines of logged events for" \
    "bulletbot.service---------\n$(journalctl -u bulletbot -n \
    20)\n---------End of bulletbot.service logs--------\n"

echo -e "Please check the logs above to make sure that there aren't any" \
    "errors, and if there are, to resolve whatever issue is causing them\n"

echo "${green}BulletBot is now running in the background${nc}"
read -p "Press [Enter] to return to the master installer menu"
