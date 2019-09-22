#!/bin/bash 

echo "[Unit]
Description=A service to execute bullet-mongo-start.sh on server reboot

[Service]
ExecStart=/bin/bash /home/bulletbot/bullet-mongo-start.sh

[Install]
WantedBy=multi-user.target" > /lib/systemd/system/bullet-mongo-start.service
systemctl enable bullet-mongo-start.service

cp /home/bulletbot/installers/linux/autorestart/bullet-mongo-start.sh /home/bulletbot
echo "Changing ownership of files added to the home directory..."
chown bulletbot:admin -R *
