#!/bin/bash

# C.1. The emails that the 'BulletBot Startup Status Report' will be sent to
# Seperate emails with a comma and a space (i.e. 'bob, jim')
#emails="email, anotheremail, andmaybeanotheremails"
mongo_attempts=0

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
        # Tracks the number of times the script has attempted to (re)start
        # bulletbot.service
        bullet_attempts=0
        # Waits to give bulletbot.service time to start up (become active)
        sleep 20 
        while true; do
            # Determines whether or not bulletbot.service is running (active)
            bullet_status=$(systemctl is-active bulletbot.service)
            if [[ $bullet_status = "active" ]]; then
                # C.1.
                #echo -e "To: $emails\nSubject: BulletBot Startup Status Report"\
                    #"\n\nbullet-mongo-start.sh successfully (re)started" \
                    #"bulletbot.service\n\nService exit status codes" \
                    #"\nmongod.service status: $mongo_status\nbulletbot.service"\
                    #"status: $bullet_status\n\n---------Last 20 lines of" \
                    #"logged events for mongod.service--------\n$(journalctl -u \
                    #mongod -n 20)\n--------End of mongod.service logs--------"\
                    #"\n\n--------Last 20 lines of logged events for" \
                    #"bulletbot.service---------\n$(journalctl -u bulletbot -n \
                    #20)\n---------End of bulletbot.service logs--------" \
                    #| mail -t
                exit 0
            elif [[ $bullet_status = "inactive" || $bullet_status = "failed" ]]; then
                # Attempts to (re)start bulletbot.service a max of 3 times
                if [[ $bullet_attempts -le 2 ]]; then
                    systemctl start bulletbot.service
                    ((bullet_attempts+=1))
                    sleep 20 # B.1.
                    continue
                else
                    # C.1.
                    #echo -e "To: $emails\nSubject: BulletBot Startup Status" \
                        #"Report\n\nWARNING!!!\nbullet-mongo-start.sh" \
                        #"could not (re)start bulletbot.service\n\nService exit"\
                        #"status codes\nmongod.service status: $mongo_status" \
                        #"\nbulletbot.service status: $bullet_status\n" \
                        #"\n---------Last 20 lines of logged events for" \
                        #"mongod.service--------\n$(journalctl -u mongod -n 20)"\
                        #"\n--------End of mongod.service logs--------" \
                        #"\n\n--------Last 20 lines of logged events for" \
                        #"bulletbot.service---------\n$(journalctl -u bulletbot \
                        #-n 20)\n---------End of bulletbot.service" \
                        #"logs--------" | mail -t
                    exit 0
                fi
            else
                # C.1.
                #echo -e "To: $emails\nSubject: BulletBot Startup Status Report"\
                    #"\n\nERROR!!!\nThe script either can't get the status of" \
                    #"bulletbot.service or the status of bulletbot.service is" \
                    #"unrecognized by the script\n\nService exit status code" \
                    #"\nmongod.service status: $mongo_status\nbulletbot.service"\
                    #"status: $bullet_status\n\n---------Last 20 lines of" \
                    #"logged events for mongod.service--------\n$(journalctl -u \
                    #mongod -n 20)\n--------End of mongod.service logs--------"\
                    #"\n\n--------Last 20 lines of logged events for" \
                    #"bulletbot.service---------\n$(journalctl -u bulletbot -n \
                    #20)\n---------End of bulletbot.service logs--------" \
                    #| mail -t
                exit 0
            fi
        done
    # Attempts to (re)start mongod.service a max of 3 times
    elif [[ $mongo_status = "inactive" || $mongo_status = "failed" ]]; then
        if [ $mongo_attempts -le 2 ]; then
            systemctl start mongod.service
            ((mongo_attempts+=1))
            sleep 20 # B.1.
            continue
        else
            # C.1.
            #echo -e "To: $emails\nSubject: BulletBot Startup Status Report" \
                #"\n\nWARNING!!!\nbullet-mongo-start.sh could not (re)start" \
                #"mongod.service\n\nService exit status codes\nmongod.service" \
                #"status: $mongo_status\nbulletbot.service status:" \
                #"$bullet_status\n\n---------Last 20 lines of logged events for"\
                #"mongod.service---------\n$(journalctl -u mongod -n 20)" \
                #"\n---------End of mongod.service logs--------\n\n--------Last"\
                #"20 lines of logged events for bulletbot.service---------" \
                #"\n$(journalctl -u bulletbot -n 20)\n---------End of" \
                #"bulletbot.service logs--------" | mail -t
            exit 0
        fi
    else
        # C.1.
        #echo -e "To: $emails\nSubject: BulletBot Startup Status Report\n" \
            #"\nERROR!!!\nThe script either can't get the status of" \
            #"mongod.service or the status of mongod.service is unrecognized by"\
            #"the script\n\nService exit status code\nmongod.service" \
            #"status: $mongo_status\nbulletbot.service status:" \
            #"$bullet_status\n\n---------Last 20 lines of logged events" \
            #"for mongod.service---------\n$(journalctl -u mongod -n 20)" \
            #"\n---------End of mongod.service logs---------\n\n--------Last 20"\
            #"lines of logged events for bulletbot.service---------" \
            #"\n$(journalctl -u bulletbot -n 20)\n---------End of" \
            #"bulletbot.service logs--------" | mail -t
        exit 0
    fi
done
