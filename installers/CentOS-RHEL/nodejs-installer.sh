#!/bin/bash

# ######################################################################### #
#                                                                           #
# nodejs-installer.sh                                                       #
# -------------------                                                       #
# Takes care of installing Node.js (version 13.x) and the required packages #
# and dependencies required for BulletBot to run.                           #
# Node.js is installed using the instructions described here:               #
# https://github.com/nodesource/distributions/blob/master/README.md         #
#                                                                           #
# Note: All variables are exported from linux-master-installer.sh and       #
# centos-rhel-installer.sh.                                                 #
#                                                                           #
# ######################################################################### #


# --------- #
# FUNCTIONS #
# --------- #
install_nodejs() {
    echo "Downloading Node.js repo installer...."
    curl -sL https://rpm.nodesource.com/setup_13.x | bash - || {
        echo "${red}Failed to download the Node.js installer" >&2
        echo "${cyan}Without the installer, nodejs can't be installed${nc}"
        read -p "Press [Enter] to return to the installer menu"
        exit 1
    }
    echo "Installing nodejs..."
    yum -y install nodejs
}

install_node_module_pkgs() {
    while true; do
        if hash npm &>/dev/null; then
            echo "Installing required packages and dependencies..."
            # Installs production packages only
            npm install --only=prod || {
                echo "${red}Failed to install required packages and dependencies" \
                    "${nc}" >&2
                read -p "Press [Enter] to return to the installer menu"
                exit 1
            }
            # Saslprep is installed via a separate command due to it not installing
            # with the command above
            npm install saslprep || {
                echo "${red}Failed to install saslprep" >&2
                echo "${cyan}Unless you are settings up MongoDB with" \
                    "Authentication, you can ignore this. Otherwise, you will" \
                    "need to install it manually.${nc}"                    
            }
            break
        else
            echo "${yellow}npm is not installed${nc}"
            
            # Npm might not be installed due to Node.js not being installed
            if ! hash node &>/dev/null; then
                echo "${yellow}nodejs is not installed${nc}"
                install_nodejs
            fi
            
            if ! hash npm &>/dev/null; then
                echo "${red}npm is not installed" >&2
                # Sometimes npm isn't installed for some reason, and it is
                # necessary to uninstall and reinstall Node.js
                echo -e "${cyan}Try uninstalling and reinstalling nodejs, then" \
                    "try again\nTo uninstall nodejs: sudo apt purge nodejs${nc}"
                read -p "Press [Enter] to return to the installer menu"
                exit 1
            fi
        fi
    done
}


# --------- #
# MAIN CODE #
# --------- #
clear

if [[ $option -eq 3 ]]; then
    printf "We will now download and install nodejs and any required packages. "
    read -p "Press [Enter] to begin."
    install_nodejs
    install_node_module_pkgs
    echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R /home/bulletbot
    echo -e "\n${green}Finished downloading and installing nodejs and any" \
        "required packages${nc}"
else
    printf "We will now install the required packages and dependencies. " 
    read -p "Press [Enter] to begin."
    install_node_module_pkgs
    echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R /home/bulletbot
    echo -e "\n${green}Finished installing required packages and dependencies${nc}"
fi

read -p "Press [Enter] to return to the installer menu"
