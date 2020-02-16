#!/bin/bash

################################################################################
#
# Runs BulletBot in the background, as a service on your system.
# If BulletBot is already running in this mode, he'll be restarted instead
#
# Note: All variables (excluding $timer and $start_time) are exported from
# 'linux-master-installer.sh', and 'debian-ubuntu-installer.sh' or
# 'centos-rhel-installer.sh'.
#
################################################################################
#
    timer=20

    clear
    printf "We will now run BulletBot in the background. "
    read -p "Press [Enter] to begin."

    # Saves the current time and date, which will be used with journalctl
    start_time=$(date +"%F %H:%M:%S")

#
################################################################################
#
# Dealing with 'bullet-mongo-start.service'
#
################################################################################
#
    # If 'bullet-mongo-start.service' is enabled
    if [[ $start_service_status = 0 ]]; then
        echo "Disabling 'bullet-mongo-start.service'..."
        systemctl disable bullet-mongo-start.service || {
            echo "${red}Failed to disable 'bullet-mongo-start.service'" >&2
            echo "${cyan}This service must be disabled in order to run" \
                "BulletBot in this run mode"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
    fi

#
################################################################################
#
# Starting and/or restarting 'bulletbot.service'
#
################################################################################
#
    if [[ $bullet_status = "active" ]]; then
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
        echo "Waiting 20 seconds for 'bulletbot.service to start..."
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
        echo -en "\r$timer seconds left "
        sleep 1
        ((timer-=1))
    done

    # Lists the startup logs in order to better identify if and when
    # an error occurred during the startup of 'bulletbot.service'
    echo -e "\n\n-------- bulletbot.service startup logs ---------" \
        "\n$(journalctl -u bulletbot -b $no_hostname -S "$start_time")" \
        "\n--------- End of bulletbot.service startup logs --------\n"

    echo -e "Please check the logs above to make sure that there aren't any" \
        "errors, and if there are, to resolve whatever issue is causing them\n"

    echo "${green}BulletBot is now running in the background${nc}"
    read -p "Press [Enter] to return to the installer menu"
