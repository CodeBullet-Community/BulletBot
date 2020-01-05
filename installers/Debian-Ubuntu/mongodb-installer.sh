#!/bin/bash

# ######################################################################### #
#                                                                           #
# mongodb-installer.sh                                                      #
# --------------------                                                      #
# Takes care of installing MongoDB 4.2.                                     #
# MongoDB is installed using the instructions described here:               #
# https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/ and   #
# https://docs.mongodb.com/manual/tutorial/install-mongodb-on-debian/       #
#                                                                           #
# Note: All variables are exported from linux-master-installer.sh and       #
# debian-ubuntu-installer.sh.                                               #
#                                                                           #
# ######################################################################### #

clear
read -p "We will now download and install MongoDB. Press [Enter] to begin."

echo "Importing public key..."
wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add - || {
    echo "${red}Failed to import public key" >&2
    echo "${cyan}The public key must be imported in order to download and install" \
        "MongoDB${nc}"
    read -p "Press [Enter] to return to the installer menu"
    exit 1
}
echo "Creating MongoDB source list file..."

if [[ $distro = "ubuntu" ]]; then
    echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu ${codename}/mongodb-org/4.2" \
        "multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list || {
            echo "${red}Failed to create MongoDB source list file" >&2
            echo "${cyan}The source list file must be created in order to" \
                "download and install MongoDB${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
elif [[ $distro = "debian" ]]; then
    echo "deb http://repo.mongodb.org/apt/debian ${codename}/mongodb-org/4.2" \
        "main" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list || {
            echo "${red}Failed to create MongoDB source list file" >&2
            echo "${cyan}The source list file must be created in order to" \
                "download and install MongoDB${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
fi

echo "Updating packages..."
apt update
echo "Installing the latest stable version of MongoDB..."
apt -y install mongodb-org || {
    echo "${red}Failed to install MongoDB${nc}"
    read -p "Press [Enter] to return to the installer menu"
    exit 1
}
echo "Enabling mongod.service..."
systemctl enable mongod.service || {
    echo "${red}Failed to enable mongod.service" >&2
    echo "${cyan}mongod.service should be enabled so that it is automatically" \
        "(re)started on system reboot${nc}"
}
echo "Starting mongod.service..."
systemctl start mongod.service || {
    echo "${red}Failed to start mongod.service" >&2
    echo "${yellow}mongod.service needs to be running for BulletBot to work${nc}"
}
echo -e "\n${green}Finished installing MongoDB${nc}"
echo "${cyan}NOTE: As a reminder, you will need to manually add the settings" \
    "document to the MongoDB database (see wiki)${nc}"
read -p "Press [Enter] to return to the installer menu"
