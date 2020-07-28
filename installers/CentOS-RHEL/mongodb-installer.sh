#!/bin/bash

################################################################################
#
# Takes care of installing MongoDB 4.2.x.
# MongoDB is installed using the instructions described here:
# https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/
#
# Note: All variables are exported from 'linux-master-installer.sh' and
# 'centos-rhel-installer.sh'.
#
################################################################################
#
    clear
    read -p "We will now download and install MongoDB. Press [Enter] to begin."

#
################################################################################
#
# [ Main ]
#
# Installing MongoDB
#
################################################################################
#
    echo "Creating MongoDB source list file..."
    echo -e "[mongodb-org-4.2]" \
        "\nname=MongoDB Repository" \
        "\nbaseurl=https://repo.mongodb.org/yum/redhat/$sver/mongodb-org/4.2/x86_64/" \
        "\ngpgcheck=1" \
        "\nenabled=1" \
        "\ngpgkey=https://www.mongodb.org/static/pgp/server-4.2.asc" > /etc/yum.repos.d/mongodb-org-4.2.repo || {
            echo "${red}Failed to create MongoDB source list file" >&2
            echo "${cyan}The source list file must be created in order to" \
                "download and install MongoDB${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
    echo "Updating packages and installing MongoDB..."
    yum -y install mongodb-org || {
        echo "Failed to install MongoDB${nc}" >&2
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }

#
################################################################################
#
# Starts and enables 'mongod.service'
#
################################################################################
#
    echo "Enabling 'mongod.service'..."
    systemctl enable mongod.service || {
        echo "${red}Failed to enable 'mongod.service'" >&2
        echo "${cyan}'mongod.service' should be enabled so that it is" \
            "automatically started on system reboot${nc}"
    }
    echo "Starting 'mongod.service'..."
    systemctl start mongod.service || {
        echo "${red}Failed to start 'mongod.service'" >&2
        echo "${yellow}'mongod.service' needs to be running for BulletBot to" \
            "work${nc}"
    }

    echo -e "\n${green}Finished installing MongoDB"
    echo "${cyan}NOTE: As a reminder, you will need to manually add the settings" \
        "document to the MongoDB database (see documentation)${nc}"
    read -p "Press [Enter] to return to the installer menu"
