#!/bin/bash

install_nodejs() {
        echo "Downloading Node.js repo installer and adding the apt key to the" \
            "system..."
        curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - || {
            echo "${red}Failed to either download the Node.js repo installer or" \
                "add the apt key to the system${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
        echo "Installing 'nodejs'..."
        apt -y install nodejs
}

install_node_module_pkgs() {
    while true; do
        if hash npm &>/dev/null; then
            echo "Installing required packages and dependencies..."
            npm install --only=prod || {
                echo "${red}Failed to install required packages and dependencies" \
                    "${nc}" >&2
                echo -e "\nExiting..."
                exit 1
            }
            break
        else
            echo "${yellow}'npm' is not on the system${nc}" >&2
            echo "'nodejs' might not be installed"
            install_nodejs
            if ! hash npm &>/dev/null; then
                echo "${red}'npm' is not on the system" >&2
                echo "${cyan}Try uninstalling and reinstalling 'nodejs', then" \
                    "try again${nc}"
                echo -e "\nExiting..."
                exit 1
            fi
        fi
    done
}


clear

# 'option' is exported from the master installer
if [[ $option -eq 3 ]]; then
    printf "We will now download and install nodejs and any required packages. "
    read -p "Press [Enter] to begin."
    install_nodejs
    install_node_module_pkgs
    echo "Changing ownership of the files added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R /home/bulletbot
    echo -e "\n${green}Finished downloading and installing nodejs and any required" \
        "packages${nc}"
else
    printf "We will now install required packages and dependencies. " 
    read -p "Press [Enter] to begin."
    install_node_module_pkgs
    echo "Changing ownership of the files added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R /home/bulletbot
    echo -e "\n${green}Finished installing required packages and dependencies${nc}"
fi

read -p "Press [Enter] to return to the master installer menu"
