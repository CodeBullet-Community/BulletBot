#!/bin/bash

mongo_restart_attempts=0

# B.1. Waits in order to give mongod.service enough time to start up (become
# active)
sleep 20

while true; do
    # Determines whether or not mongod.service is running (active)
    mongo_status=$(systemctl is-active mongod.service)
    if [[ $mongo_status = "active" ]]; then
        # Waits in order to allow for mongodb to finish initializing and setting
        # up database
        sleep 40
        systemctl start bulletbot.service
        bullet_restart_attempts=0
        # Waits to give bulletbot.service time to start up (become active)
        sleep 20 
        while true; do
            # Determines whether or not bulletbot.service is running (active)
            bullet_status=$(systemctl is-active bulletbot.service)
            if [[ $bullet_status = "active" ]]; then
                exit 0
            elif [[ $bullet_status = "inactive" || $bullet_status = "failed" ]]; then
                # Attempts to (re)start bulletbot.service a max of 3 times
                if [[ $bullet_restart_attempts -le 2 ]]; then
                    systemctl start bulletbot.service
                    ((bullet_restart_attempts+=1))
                    sleep 20 # B.1.
                    continue
                else
                    exit 1
                fi
            else
                exit 1
            fi
        done
    # Attempts to (re)start mongod.service a max of 3 times
    elif [[ $mongo_status = "inactive" || $mongo_status = "failed" ]]; then
        if [[ $mongo_restart_attempts -le 2 ]]; then
            systemctl start mongod.service
            ((mongo_restart_attempts+=1))
            sleep 20 # B.1.
            continue
        else
            exit 1
        fi
    else
        exit 1
    fi
done