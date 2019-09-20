#!/bin/bash

clear
read -p "We will now download and install MongoDB"
echo "Importing public key"
wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add - || {
    echo "${red}Failed to import public key${nc}" >&2
    exit 1
}
echo "Creating MongoDB list file"
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list || {
        echo "${red}Failed to create MongoDB list file${nc}" >&2
        exit 1
    }
echo "Updating packages"
apt update
echo "Installing latest stable version of MongoDB"
apt -y install mongodb-org
echo ""
read -p "${green}Finished installing MongoDB${nc}"
