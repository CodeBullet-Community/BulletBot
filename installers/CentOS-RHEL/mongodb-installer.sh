#!/bin/bash

clear
read -p "We will now download and install MongoDB. Press [Enter] to begin."
echo "Creating MongoDB source list file..."
# Will get the source files for ubuntu based operating systems
# All variables are exported from the master installer
echo "[mongodb-org-4.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$sver/mongodb-org/4.2/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.2.asc" > /etc/yum.repos.d/mongodb-org-4.2.repo || {
    echo "${red}Failed to create MongoDB source list file" >&2
    echo "${cyan}The source list file has to be created in order to download and \
        install MongoDB${nc}"
    read -p "Press [Enter] to return to the master installer menu"
    exit 1
}
echo "Updating packages and installing the latest stable version of MongoDB..."
yum -y install mongodb-org
echo "Enabling 'mongod.service'..."
systemctl enable mongod.service
echo "Starting 'mongod.service'..."
systemctl start mongod.service
echo -e "\n${green}Finished installing MongoDB${nc}"
echo "${cyan}NOTE: As a reminder, you will need to manually add the settings" \
    "document to the MongoDB database (see wiki)${nc}"
read -p "Press [Enter] to return to the master installer menu"
