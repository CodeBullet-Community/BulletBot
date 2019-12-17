#!/bin/bash

# ########################################################################### #
#                                                                             #
# run-in-background.sh                                                        #
# --------------------------------                                            #
# Runs BulletBot in the background, as a service on your system.              #
# If BulletBot is already running in this mode, BulletBot will be restarted.  #
#                                                                             #
# Note: All variables (excluding $timer) are exported from                    #
# linux-master-installer.sh and debian-ubuntu-installer.sh or                 #
# centos-rhel-installer.sh.                                                   #
#                                                                             #
# ########################################################################### #

timer=20

clear
read -p "We will now run BulletBot in the background. Press [Enter] to begin."

if [[ -f $start_script_exists || -f $start_service_exists ]]; then
    echo "Removing file(s) used to run BulletBot with auto-restart..."
    rm /home/bulletbot/bullet-mongo-start.sh 2>/dev/null
    rm /lib/systemd/system/bullet-mongo-start.service 2>/dev/null
    # Reloads systemd daemons to account for the deleted service
    systemctl daemon-reload
fi

if [[ ! -f $bullet_service_exists ]]; then
    echo "Creating bulletbot.service..."
    echo "[Unit]
Description=A service to start BulletBot after a crash or system reboot
After=network.target mongod.service

[Service]
User=bulletbot
ExecStart=/usr/bin/node ${home}/out/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target" > /lib/systemd/system/bulletbot.service
    # Reloads systemd daemons to account for the added service
    systemctl daemon-reload
fi

if [[ $bullet_status = "active" ]]; then
    echo "Restarting bulletbot.service..."
    systemctl restart bulletbot.service || {
        echo "${red}Failed to restart bulletbot.service${nc}" >&2
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }
    echo "Waiting 20 seconds for bulletbot.service to restart..."
else
    echo "Starting bulletbot.service..."
    systemctl start bulletbot.service || {
        echo "${red}Failed to start bulletbot.service${nc}" >&2
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }
    echo "Waiting 20 seconds for bulletbot.service to start..."
fi

# Waits in order to give bulletbot.service enough time to (re)start
while ((timer > 0)); do
    echo -en "$timer seconds left \r"
    sleep 1
    ((timer-=1))
done

# Lists the last 40 logs in order to better identify if and when
# an error occurred during the start-up of bulletbot.service
echo -e "\n\n--------Last 40 lines of logged events for" \
    "bulletbot.service---------\n$(journalctl -u bulletbot -n \
    40)\n---------End of bulletbot.service logs--------\n"

echo -e "Please check the logs above to make sure that there aren't any" \
    "errors, and if there are, to resolve whatever issue is causing them\n"

echo "${green}BulletBot is now running in the background${nc}"
read -p "Press [Enter] to return to the installer menu"
