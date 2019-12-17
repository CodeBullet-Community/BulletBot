#!/bin/bash

# ########################################################################### #
#                                                                             #
# bullet-mongo-start.sh                                                       #
# ---------------------                                                       #
# Used in combination with the bullet-mongo-start.service to automatically    #
# (re)start BulletBot on system reboot. It makes sure that the MongoDB        #
# service and database has started and is fully initialized before starting   #
# BulletBot.                                                                  #
#                                                                             #
# Script Purpose                                                              #
# --------------                                                              #
# For some reason, bulletbot.service, if enabled, will start and connect to   #
# the MongoDB database before it has fully initialized, which will cause      #
# problems. This script will give the database and service enough time to     #
# initialize before attempting to start bulletbot.service.                    #
#                                                                             #
# ########################################################################### #

mongo_restart_attempts=0

# A.1. Waits in order to give mongod.service enough time to start (become active)
sleep 20

while true; do
    mongo_status=$(systemctl is-active mongod.service)
    if [[ $mongo_status = "active" ]]; then
        # Waits in order to allow MongoDB to finish initializing and setting
        # up its database
        sleep 40
        systemctl start bulletbot.service
        bullet_restart_attempts=0
        # Waits in order to give bulletbot.service time to start (become active)
        sleep 20 
        while true; do
            bullet_status=$(systemctl is-active bulletbot.service)
            if [[ $bullet_status = "active" ]]; then
                exit 0
            elif [[ $bullet_status = "inactive" || $bullet_status = "failed" ]]; then
                # Attempts to (re)start bulletbot.service for a max of 3 times
                if [[ $bullet_restart_attempts -le 2 ]]; then
                    systemctl start bulletbot.service
                    ((bullet_restart_attempts+=1))
                    sleep 20 # A.1.
                    continue
                else
                    exit 1
                fi
            else
                exit 1
            fi
        done
    # Attempts to (re)start mongod.service for a max of 3 times
    elif [[ $mongo_status = "inactive" || $mongo_status = "failed" ]]; then
        if [[ $mongo_restart_attempts -le 2 ]]; then
            systemctl start mongod.service
            ((mongo_restart_attempts+=1))
            sleep 20 # A.1.
            continue
        else
            exit 1
        fi
    else
        exit 1
    fi
done
