#!/bin/bash

################################################################################
#
# Used in combination with the bullet-mongo-start.service to automatically
# start BulletBot on system reboot. It makes sure that the MongoDB 
# service and database has started and is fully initialized before starting
# BulletBot.
#
# Script Purpose
# ==============
# For some reason, bulletbot.service, if enabled, will start and connect to
# the MongoDB database before it has fully initialized, which will cause
# problems. This script will give the database and service enough time to
# initialize before attempting to start bulletbot.service.
#
# BulletBot Startup Status Report (optional)
# ===============================
# This startup script has an optional feature of emailing a status report
# about BulletBot's startup, to a collection of emails that'd be placed in
# ./bullet-mongo-start.conf. More information on how to configure and use
# this feature can be found here: 
# https://github.com/CodeBullet-Community/BulletBot/wiki/Sending-BulletBot-Startup-Status-Reports
#
# Note: Along with 'bullet-mongo-start.conf', this is the only script apart of
# the installers that is not called by either the master installer or
# sub-master installer(s). It is independent and only called on system reboot.
#
# Note 2: $no_hostname is purposefully unquoted. Do not quote those variables.
#
################################################################################
#
    # Tries to load custom configurations, but will load the default if the
    # custom one do not exist
    if [[ -f /home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.local ]]; then
        . /home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.local
    else
        . /home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.conf
    fi

#
################################################################################
#
# Global [ variables ]
#
################################################################################
#
    addresses=$_MAIL_TO # The email addresses that the Status Report is sent to
    send_status=$_SEND_STATUS # Determines if the Status Report can be/is sent
    attempt_mongo_restart=true

    # The '--no-hostname' flag for journalctl only works with systemd 230 and
    # above
    if [[ $(journalctl --version | grep -oP "[0-9]+" | head -1) -ge "230" ]]; then
        no_hostname="--no-hostname"
    fi

#
################################################################################
#
# Performs checks to see if it is possible to send the Status Report as an email
# through postfix via sendmail.
#
################################################################################
#
    if [[ $send_status = true ]]; then
        if hash postfix &>/dev/null; then
            if hash sendmail &>/dev/null; then
                # If the email addresses in the config file are the default
                # example email addresses
                if [[ ! $addresses || $addresses =~ example.com ]]; then
                    send_status=false
                    echo "[WARNING] The email addresses in 'bullet-mongo-start.conf'" \
                        "are example addresses" >&2
                # If the email addresses are not valid
                elif [[ ! $(echo $addresses | grep -E -o "\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}\b") \
                        ]]; then
                    send_status=false
                    echo "[WARNING] One or more or the email addresses in" \
                        "'bullet-monog-start.conf' are invalid" >&2
                fi
            else
                send_status=false
                echo "[WARNING] Sendmail is not installed and is required to" \
                    "send the 'BulletBot Startup Status Report'" >&2
            fi
        else
            send_status=false
            echo "[WARNING] Postfix is not installed and is required to send" \
                "the 'BulletBot Startup Status Report'" >&2
        fi
    fi

#
################################################################################
#
# Attempts to start 'bulletbot.service'
#
################################################################################
#
    echo "Waiting 20 seconds (initial wait period)"
    # A.1. Waits in order to give 'mongod.service' enough time to start (become
    # active)
    sleep 20

    while true; do
        mongo_status=$(systemctl is-active mongod.service)
        if [[ $mongo_status = "active" ]]; then
            # Waits in order to allow MongoDB to finish initializing and setting
            # up its database
            echo "Waiting 40 seconds (MongoDB database initialization wait period)"
            sleep 40
            echo "Starting 'bulletbot.service'"
            systemctl start bulletbot.service
            # Waits in order to give 'bulletbot.service' time to start (become
            # active)
            echo "Waiting 20 seconds ('bulletbot.service' start wait period)"
            sleep 20 
            while true; do
                bullet_service_status=$(systemctl is-active bulletbot.service)
                if [[ $bullet_service_status = "active" ]]; then
                    echo "Successfully started 'bulletbot.service'"
                    if [[ $send_status = true ]]; then
                        echo "Sending 'BulletBot Startup Status Report'"
                        echo -e "To: $addresses\nSubject: BulletBot Startup Status Report" \
                            "\n\nSuccessfully started bulletbot.service" \
                            "\n\nService exit status codes" \
                            "\n    mongod.service status: $mongo_status" \
                            "\n    bulletbot.service status: $bullet_service_status" \
                            "\n\n-------- mongod.service startup logs --------" \
                            "\n$(journalctl -u mongod -b $no_hostname)" \
                            "\n-------- End of mongod.service startup logs --------" \
                            "\n\n-------- bulletbot.service startup logs --------" \
                            "\n$(journalctl -u bulletbot -b $no_hostname)" \
                            "\n-------- End of bulletbot.service startup logs --------" \
                            "\n\n-------- bullet-mongo-start.service startup logs --------" \
                            "\n$(journalctl -u bullet-mongo-start -b $no_hostname)" \
                            "\n-------- End of bullet-mongo-start.service startup logs --------" \
                            | sendmail -t || {
                                echo "Failed to send 'BulletBot Startup Status" \
                                    "Report'" >&2
                                echo "Done..."
                                exit 1
                            }
                    fi
                    echo "Done..."
                    exit 0
                elif [[ $bullet_service_status = "inactive" || $bullet_service_status = "failed" \
                        ]]; then
                    echo "Failed to start 'bulletbot.service'" >&2
                    if [[ $send_status = true ]]; then
                        echo "Sending 'BulletBot Startup Status Report'"
                        echo -e "To: $addresses\nSubject: BulletBot Startup Status Report" \
                            "\n\nWARNING!!!" \
                            "\nCould not start bulletbot.service" \
                            "\n\nService exit status codes" \
                            "\n    mongod.service status: $mongo_status" \
                            "\n    bulletbot.service status: $bullet_service_status" \
                            "\n\n-------- mongod.service startup logs --------" \
                            "\n$(journalctl -u mongod -b $no_hostname)" \
                            "\n-------- End of mongod.service startup logs --------" \
                            "\n\n-------- bulletbot.service startup logs --------" \
                            "\n$(journalctl -u bulletbot -b $no_hostname)" \
                            "\n-------- End of bulletbot.service startup logs --------" \
                            "\n\n-------- bullet-mongo-start.service startup logs --------" \
                            "\n$(journalctl -u bullet-mongo-start -b $no_hostname)" \
                            "\n-------- End of bullet-mongo-start.service startup logs --------" \
                            | sendmail -t || {
                                echo "Failed to send 'BulletBot Startup Status" \
                                    "Report'" >&2
                                echo "Done..."
                                exit 1
                            }
                    fi
                    echo "Done..."
                    exit 0
                else
                    echo "[ERROR] Either could not get the status of 'bulletbot.service'" \
                        "or the status of 'bulletbot.service' is unrecognized" >&2
                    if [[ $send_status = true ]]; then
                        echo "Sending 'BulletBot Startup Status Report'"
                        echo -e "To: $addresses\nSubject: BulletBot Startup Status Report" \
                            "\n\nERROR!!!" \
                            "\nEither could not get the status of bulletbot.service" \
                            "or the status of bulletbot.service is unrecognized" \
                            "\n\nService exit status codes" \
                            "\n    mongod.service status: $mongo_status" \
                            "\n    bulletbot.service status: $bullet_service_status" \
                            "\n\n-------- mongod.service startup logs --------" \
                            "\n$(journalctl -u mongod -b $no_hostname)" \
                            "\n-------- End of mongod.service startup logs --------" \
                            "\n\n-------- bulletbot.service startup logs --------" \
                            "\n$(journalctl -u bulletbot -b $no_hostname)" \
                            "\n-------- End of bulletbot.service startup logs --------" \
                            "\n\n-------- bullet-mongo-start.service startup logs --------" \
                            "\n$(journalctl -u bullet-mongo-start -b $no_hostname)" \
                            "\n-------- End of bullet-mongo-start.service startup logs --------" \
                            | sendmail -t || {
                                echo "Failed to send 'BulletBot Startup Status Report'" >&2
                                echo "Done..."
                                exit 1
                            }
                    fi
                    echo "Done..."
                    exit 0
                fi
            done
        # Attempts to start 'mongod.service'
        elif [[ $mongo_status = "inactive" || $mongo_status = "failed" ]]; then
            if [[ $attempt_mongo_restart = true ]]; then
                echo "Starting 'mongod.service'"
                systemctl start mongod.service
                attempt_mongo_restart=false
                echo "Waiting 20 seconds ('mongod.service' start wait period)"
                sleep 20
                continue
            else
                echo "Failed to start 'mongod.service'" >&2
                if [[ $send_status = true ]]; then
                    echo "Sending 'BulletBot Startup Status Report'"
                    echo -e "To: $addresses\nSubject: BulletBot Startup Status Report" \
                        "\n\nWARNING!!!" \
                        "\nCould not start mongod.service" \
                        "\n\nService exit status codes" \
                        "\n    mongod.service status: $mongo_status" \
                        "\n    bulletbot.service status: $bullet_service_status" \
                        "\n\n-------- mongod.service startup logs --------" \
                        "\n$(journalctl -u mongod -b $no_hostname)" \
                        "\n-------- End of mongod.service startup logs --------" \
                        "\n\n-------- bulletbot.service startup logs --------" \
                        "\n$(journalctl -u bulletbot -b $no_hostname)" \
                        "\n-------- End of bulletbot.service startup logs --------" \
                        "\n\n-------- bullet-mongo-start.service startup logs --------" \
                        "\n$(journalctl -u bullet-mongo-start -b $no_hostname)" \
                        "\n-------- End of bullet-mongo-start.service startup logs --------" \
                        | sendmail -t || {
                            echo "Failed to send 'BulletBot Startup Status Report'" >&2
                            echo "Done..."
                            exit 1
                        }
                fi
                echo "Done..."
                exit 0
            fi
        else
            echo "[ERROR] Either could not get the status of 'mongod.service'" \
                "or the status of 'mongod.service' is unrecognized" >&2
            if [[ $send_status = true ]]; then
                echo "Sending 'BulletBot Startup Status Report'"
                echo -e "To: $addresses\nSubject: BulletBot Startup Status Report" \
                    "\nERROR!!!" \
                    "\nEither could not get the status of mongod.service" \
                    "or the status of mongod.service is unrecognized" \
                    "\n\nService exit status codes" \
                    "\n    mongod.service status: $mongo_status" \
                    "\n    bulletbot.service status: $bullet_service_status" \
                    "\n\n-------- mongod.service startup logs --------" \
                    "\n$(journalctl -u mongod -b $no_hostname)" \
                    "\n-------- End of mongod.service startup logs --------" \
                    "\n\n-------- bulletbot.service startup logs --------" \
                    "\n$(journalctl -u bulletbot -b $no_hostname)" \
                    "\n-------- End of bulletbot.service startup logs --------" \
                    "\n\n-------- bullet-mongo-start.service startup logs --------" \
                    "\n$(journalctl -u bullet-mongo-start -b $no_hostname)" \
                    "\n-------- End of bullet-mongo-start.service startup logs --------" \
                    | sendmail -t || {
                        echo "Failed to send 'BulletBot Startup Status Report'" >&2
                        echo "Done..."
                        exit 1
                    }
            fi
            echo "Done..."
            exit 0
        fi
    done
