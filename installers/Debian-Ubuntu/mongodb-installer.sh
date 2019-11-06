#!/bin/bash

clear
read -p "We will now download and install MongoDB. Press [Enter] to begin."
echo "Importing public key..."
wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add - || {
    echo "${red}Failed to import public key" >&2
    echo "${cyan}The public key must be imported in order to download and install \
        MongoDB${nc}"
    read -p "Press [Enter] to return to the master installer menu"
    exit 1
}
echo "Creating MongoDB source list file..."
# Will get the source files for ubuntu based operating systems
# 'os' is exported from the master installer
if [[ $os = "ubuntu" ]]; then
    # A.1. 'codename' is exported from the master installer
    echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu ${codename}/mongodb-org/4.2" \
        "multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list || {
            echo "${red}Failed to create MongoDB source list file" >&2
            echo "${cyan}The source list file has to be created in order to" \
                "download and install MongoDB${nc}"
            read -p "Press [Enter] to return to the master installer menu"
            exit 1
        }
elif [[ $os = "debian" ]]; then
    # A.1.
    echo "deb http://repo.mongodb.org/apt/debian ${codename}/mongodb-org/4.2" \
        "main" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list || {
            echo "${red}Failed to create MongoDB source list file" >&2
            echo "${cyan}The source list file has to be created in order to" \
                "download and install MongoDB${nc}"
            read -p "Press [Enter] to return to the master installer menu"
            exit 1
        }
fi
echo "Updating packages..."
apt update
echo "Installing the latest stable version of MongoDB..."
apt -y install mongodb-org
echo "Enabling 'mongod.service'..."
systemctl enable mongod.service
echo "Starting 'mongod.service'..."
systemctl start mongod.service
echo -e "\n${green}Finished installing MongoDB${nc}"
echo "${cyan}NOTE: As a reminder, you will need to manually add the settings" \
    "document to the MongoDB database (see wiki)${nc}"
read -p "Press [Enter] to return to the master installer menu"
