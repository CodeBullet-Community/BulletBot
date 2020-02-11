#!/bin/bash

# ########################################################################### #
#                                                                             #
# run-in-background-auto-restart.sh                                            #
# --------------------------------                                            #
# Runs BulletBot in the background, as a service on your system, with         #
# auto-restart on system reboot. This means that if the system is rebooted or #
# is turned back on, BulletBot will automatically be started. If          #
# BulletBot is already running in this mode, BulletBot will be restarted.     #
#                                                                             #
# Note: All variables (excluding $timer) are exported from                    #
# linux-master-installer.sh and debian-ubuntu-installer.sh or                 #
# centos-rhel-installer.sh.                                                   #
#                                                                             #
# ########################################################################### #

timer=20

clear
read -p "We will now run BulletBot in the background with auto-restart on system \
reboot. Press [Enter] to begin."

# Saves the current time and date to be used with journalctl
start_time=$(date +"%F %H:%M:%S")

# If bullet-mongo-start.service exists and is not enabled
if [[ -f $start_service && $start_service_status != 0 ]]; then
    echo "Enabling bullet-mongo-start.service..."
    systemctl enable bullet-mongo-start.service || {
        echo "${red}Failed to enable bullet-mongo-start.service" >&2
        echo "${cyan}This service must be enabled in order to run BulletBot" \
            "in this run mode${nc}"
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }
# If bullet-mongo-start.service doesn't exist
elif [[ ! -f $start_service ]]; then
    echo "Creating bullet-monog-start.service..."
    ./installers/Linux_Universal/auto-restart/auto-restart-updater.sh
    # Reloads systemd daemons to account for the added service
    systemctl daemon-reload
    echo "Enabling bullet-mongo-start.service..."
    systemctl enable bullet-mongo-start.service || {
        echo "${red}Failed to enable bullet-mongo-start.service" >&2
        echo "${cyan}This service must be enabled in order to run BulletBot" \
            "in this run mode${nc}"
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }
fi

if [[ ! -f $start_script ]]; then
    echo "${red}bullet-mongo-start.sh does not exist" >&2
    echo "${cyan}bullet-mongo-start.sh is required to use this run mode"
    echo "Re-download bulletbot using the installers, then retry using this" \
        "run mode${nc}"
    read -p "Press [Enter] to return to the installer menu"
    exit 1
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
    echo -en "\r$timer seconds left "
    sleep 1
    ((timer-=1))
done

# Lists the startup logs in order to better identify if and when
# an error occurred during the startup of bulletbot.service
echo -e "\n\n-------- bulletbot.service startup logs ---------" \
    "\n$(journalctl -u bulletbot -b --no-hostname -S "$start_time")" \
    "\n--------- End of bulletbot.service startup logs --------\n"

echo -e "Please check the logs above to make sure that there aren't any" \
    "errors, and if there are, to resolve whatever issue is causing them\n"

echo "${green}BulletBot is now running in the background with auto-restart" \
    "on system reboot${nc}"
read -p "Press [Enter] to return to the installer menu"
