#!/bin/bash

install_nodejs() {
        echo "Downloading nodejs repo installer and adding it to system..."
        # In the future, the url in this script will most likey change 
        # to the most recent version of the download
        curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - || {
            echo "${red}Failed to either download the nodejs repo installer or" \
                "add it to system${nc}" >&2
            exit 1
        }
        echo "Installing nodejs..."
        apt -y install nodejs
}

install_node_module_pkgs() {
    while true; do
        if hash npm &>/dev/null; then
            echo "Installing packages and dependencies..."
            npm install || {
                echo "${red}Failed to install packages and dependencies${nc}" >&2
                exit 1
            }
            break
        else
            echo "${red}'npm' is not on the system${nc}" >&2
            echo "nodejs might not be installed"
            install_nodejs
            if ! hash npm &>/dev/null; then
                echo "${red}'npm' is not on the system" >&2
                echo "Try uninstalling and reinstalling 'nodejs', then try again${nc}"
                exit 1
            fi
        fi
    done
}


clear

if [[ $option -eq 3 ]]; then
    read -p "We will now download and install nodejs and any required packages"
    install_nodejs
    echo "Installing packages and dependencies..."
    install_node_module_pkgs
    echo "Changing ownership of installed files..."
    chown bulletbot:admin -R *
    echo ""
    read -p "${green}Finished installing downloading and installing nodejs and any \
 required packages${nc}"
else
    read -p "We will now install required packages via npm"
    install_node_module_pkgs
    echo "Changing ownership of files added to the home directory..."
    chown bulletbot:admin -R *
    echo ""
    read -p "${green}Finished installing required packages and dependencies${nc}"
fi
