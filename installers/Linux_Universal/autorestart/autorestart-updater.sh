#!/bin/bash

# #################################################################### #
#                                                                      #
# autorestart-updater.sh                                               #
# ----------------------                                               #
# Contains code that is used by debian-ubuntu-installer.sh,            #
# centos-rhel-installer.sh, and run-in-background-autorestart.sh. This #
# prevents the same chunk of code existing in multiple files.          #
#                                                                      #
# #################################################################### #

echo "[Unit]
Description=A service to execute bullet-mongo-start.sh on system reboot

[Service]
ExecStart=/bin/bash /home/bulletbot/installers/Linux_Universal/autorestart/bullet-mongo-start.sh
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=bullet-mongo-start

[Install]
WantedBy=multi-user.target" > /lib/systemd/system/bullet-mongo-start.service
systemctl enable bullet-mongo-start.service
