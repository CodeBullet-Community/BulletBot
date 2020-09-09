#!/bin/bash

################################################################################
#
# Runs BulletBot in the background, as a service on your system, with
# auto-restart on system reboot. This means that if the system is rebooted or
# is turned back on, BulletBot will automatically be started. If
# BulletBot is already running in this mode, he'll be restarted instead.
#
# Note: All variables (excluding $timer and $start_time) are exported from
# 'linux-master-installer.sh', and 'debian-ubuntu-installer.sh' or
# 'centos-rhel-installer.sh'.
#
################################################################################
#
    timer=20

    clear
    printf "We will now run BulletBot in the background with auto-restart on system reboot. "
    read -p "Press [Enter] to begin."

    # Saves the current time and date, which will be used with journalctl
    start_time=$(date +"%F %H:%M:%S")

#
################################################################################
#
# Dealing with the creation, enabling, and starting of 
# 'bullet-mongo-start.service'
#
################################################################################
#
    # If 'bullet-mongo-start.service' exists and is not enabled
    if [[ -f $start_service && $start_service_status != 0 ]]; then
        echo "Enabling 'bullet-mongo-start.service'..."
        systemctl enable bullet-mongo-start.service || {
            echo "${red}Failed to enable 'bullet-mongo-start.service'" >&2
            echo "${cyan}This service needs to be enabled in order to use this" \
                "run mode${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
    # If 'bullet-mongo-start.service' does not exist
    elif [[ ! -f $start_service ]]; then
        echo "Creating 'bullet-mongo-start.service'..."
        ./installers/Linux_Universal/auto-restart/auto-restart-updater.sh || {
            echo "${red}Failed to create 'bullet-mongo-start.service'" >&2
            echo "${cyan}This service is required to use this run mode${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
        # Reloads systemd daemons to account for the added service
        systemctl daemon-reload
        echo "Enabling 'bullet-mongo-start.service'..."
        systemctl enable bullet-mongo-start.service || {
            echo "${red}Failed to enable 'bullet-mongo-start.service'" >&2
            echo "${cyan}This service must be enabled in order to run" \
                "BulletBot in this run mode${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
    fi

    # If 'bullet-mongo-start.sh' doesn't exist
    if [[ ! -f $start_script ]]; then
        echo "${red}'bullet-mongo-start.sh' does not exist" >&2
        echo "${cyan}'bullet-mongo-start.sh' is required to use this run mode${cn}"
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    fi

#
################################################################################
#
# Starting or restarting 'bulletbot.service'
#
################################################################################
#
    if [[ $bulletbot_service_status = "active" ]]; then
        echo "Restarting 'bulletbot.service'..."
        systemctl restart bulletbot.service || {
            echo "${red}Failed to restart 'bulletbot.service'${nc}" >&2
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
        echo "Waiting 20 seconds for 'bulletbot.service' to restart..."
    else
        echo "Starting 'bulletbot.service'..."
        systemctl start bulletbot.service || {
            echo "${red}Failed to start 'bulletbot.service'${nc}" >&2
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
        echo "Waiting 20 seconds for 'bulletbot.service' to start..."
    fi

#
################################################################################
#
# Waits then displays the startup logs of 'bulletbot.service'
#
################################################################################
#
    # Waits in order to give 'bulletbot.service' enough time to (re)start
    while ((timer > 0)); do
        echo -en "${clrln}${timer} seconds left"
        sleep 1
        ((timer-=1))
    done

    # Note: $no_hostname is purposefully unquoted. Do not quote those variables.
    echo -e "\n\n-------- bulletbot.service startup logs ---------" \
        "\n$(journalctl -u bulletbot -b $no_hostname -S "$start_time")" \
        "\n--------- End of bulletbot.service startup logs --------\n"

    echo -e "${cyan}Please check the logs above to make sure that there aren't any" \
        "errors, and if there are, to resolve whatever issue is causing them\n"

    echo "${green}BulletBot is now running in the background with auto-restart" \
        "on system reboot${nc}"
    read -p "Press [Enter] to return to the installer menu"
