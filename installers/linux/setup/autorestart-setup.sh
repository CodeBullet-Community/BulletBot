echo "[Unit]
Description=A service to start BulletBot after a crash or server reboot
After=network.target mongod.service

[Service]
User=bulletbot
ExecStart=/usr/bin/node /home/bulletbot/out/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
" > /lib/systemd/system/bulletbot.service
echo "[Unit]
Description=A service to execute bullet-mongo-start.sh on server reboot

[Service]
ExecStart=/bin/bash /home/bulletbot/bullet-mongo-start.sh

[Install]
WantedBy=multi-user.target
" > /lib/systemd/system/bullet-mongo-start.service