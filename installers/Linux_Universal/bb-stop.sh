#!/bin/bash

################################################################################
#
# Is in charge of stopping 'bulletbot.service', which in turn will stop
# BulletBot.
#
# Note: All variables are exported from 'linux-master-installer.sh', and
# 'debian-ubuntu-installer.sh' or 'centos-rhel-installer.sh'.
#
################################################################################
    
clear
read -p "We will now stop BulletBot. Press [Enter] to begin."

if [[ $bullet_service_status = "active" ]]; then
    echo "Stopping 'bulletbot.service'..."
    systemctl stop bulletbot || {
        echo "${red}Failed to stop 'bulletbot.service'" >&2
        echo "${cyan}Failed to stop BulletBot${nc}"
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }
    echo -e "\n${green}BulletBot has been stopped${nc}"
else
    echo -e "\n${cyan}BulletBot is currently not running${nc}"
fi   

read -p "Press [Enter] to return to the installer menu"
