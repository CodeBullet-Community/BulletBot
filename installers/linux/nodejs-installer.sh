#!/bin/bash

install_nodejs() {
        echo "Downloading nodejs repo installer and adding apt key to the system..."
        curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - || {
            echo "${red}Failed to either download the nodejs repo installer or" \
                "add the apt key to the system${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
        echo "Installing 'nodejs'..."
        # Will install nodejs, node, and npm
        apt -y install nodejs
}

install_node_module_pkgs() {
    while true; do
        # Checks to see if npm is installed, due to the required packages being
        # installed/setup use that command
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
            echo "${red}'npm' is not on the system${nc}" >&2
            echo "'nodejs' might not be installed"
            install_nodejs
            if ! hash npm &>/dev/null; then
                echo "${red}'npm' is not on the system" >&2
                echo "Try uninstalling and reinstalling 'nodejs', then try again${nc}"
                echo -e "\nExiting..."
                exit 1
            fi
        fi
    done
}


clear

if [[ $option -eq 3 ]]; then
    read -p "We will now download and install nodejs and any required packages"
    install_nodejs
    install_node_module_pkgs
    echo "Changing ownership of files added to the home directory..."
    chown bulletbot:admin -R *
    echo -e "\n${green}Finished downloading and installing nodejs and any required" \
        "packages${nc}"
else
    read -p "We will now install required packages and dependencies via npm"
    install_node_module_pkgs
    echo "Changing ownership of files added to the home directory..."
    chown bulletbot:admin -R *
    echo -e "\n${green}Finished installing required packages and dependencies${nc}"
fi

read -p "Press [Enter] to continue to the master installer menu"
