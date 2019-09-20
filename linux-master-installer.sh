#!/bin/bash

green=$'\033[0;32m'
cyan=$'\033[0;36m'
red=$'\033[1;31m'
nc=$'\033[0m'
execution_path="$(dirname $0)"
start_script_exists=$(find . -path installers -prune -o -print | grep \
    -i "bullet-mongo-start.sh" &>/dev/null; echo $?)
bullet_service_exists=$(systemctl list-units --full --all | grep -Fq \
    "bulletbot.service" &>/dev/null; echo $?)
start_service_exists=$(systemctl list-units --full --all | grep -Fq \
    "bullet-mongo-start.service" &>/dev/null; echo $?)
# TODO: Change the urls below when everything is moved to new repo
tag=$(curl -s https://api.github.com/repos/StrangeRanger/Bull/releases/latest \
    | grep -oP '"tag_name": "\K(.*)(?=")')
latest_release="https://github.com/StrangeRanger/Bull/releases/download/${tag}/BulletBot.zip"

# Checks to see if this script was executed with root privilege, and if not,
# stops the script
if [[ $EUID -ne 0 ]]; then 
    echo "${red}Please run this script as root or with root privilege${nc}"
    exit 1
fi


# ----------------------------------- #
# FUNCTION USED ALL THROUGHOUT SCRIPT #
# ----------------------------------- #
# This function deals with downloading BulletBot (the latest release from github)
# then replaces the existing the existing BulletBot code with it, if there is any
download_bb() {
    clear
    read -p "We will now download the compiled version of the newest release"
    
    # Installs wget on system if it isn't already
    if ! hash wget &>/dev/null; then
        echo "${red}wget is not installed${nc}"
        echo "Installing wget..."
        apt -y install wget || {
            echo "${red}Failed to install wget${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # Installs unzip on system if it isn't already
    if ! hash unzip &>/dev/null; then
        echo "${red}unzip is not installed on system${nc}"
        echo "Installing unzip..."
        apt -y install unzip || {
            echo "${red}Failed to install unzip${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # If uncompiled code exists instead of the compiled code
    if [ -d src ]; then
        # Moves/saves 'bot-config.json', if it exists, to 'tmp/'
        if [ -f src/bot-config.json ]; then
            mkdir tmp
            mv src/bot-config.json tmp/ || {
                echo "${red}Failed to move 'bot-config.json' to 'tmp/'" >&2
                echo "Please move it manually before continuing${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi

        # Removes unneeded files
        echo "Removing unneeded files..."
        if [ -d src ]; then rm -r src/; fi
        if [ -d media ]; then rm -r media/; fi
        if [ -f tsconfig.json ]; then rm tsconfig.json; fi
    fi
    
    echo "Downloading latest release"
    wget -N $latest_release || {
        echo "${red}Failed to download the latest release${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    }
    
    echo "Unzipping BulletBot.zip..."
    unzip -o BulletBot.zip
    echo "Removing BulletBot.zip..."
    rm BulletBot.zip
    
    # Moves 'bot-config.json' back to where it belongs ('out/')
    if [ -f tmp/bot-config.json ]; then
        mv tmp/bot-config.json out/ || {
            echo "${red}Failed to move 'bot-config.json' to 'out/'" >&2
            echo "Before starting the bot, you will have to manually move it${nc}"
        }
        rm -r tmp/
    fi

    # Either creates or updates bulletbot.service
    echo "Creating/updating bulletbot.service..."
    echo "[Unit]
Description=A service to start BulletBot after a crash or server reboot
After=network.target mongod.service

[Service]
User=bulletbot
ExecStart=/usr/bin/node /home/bulletbot/out/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target" > /lib/systemd/system/bulletbot.service 

    if ($start_script_exists && $start_service_exists) &>/dev/null; then
        echo "Updating startup script and service..."
        bash installers/linux/setup/autorestart-setup.sh
    fi
    
    echo "Changing ownership of installed files..."
    chown bulletbot:admin -R *
    echo -e "\n${green}Finished downloading and updating BulletBot${nc}"
    read -p "Press 'Enter' to apply any existing changes to 'linux-master-installer.sh'"
    clear
    source linux-master-installer.sh
}


# --------- #
# MAIN CODE #
# --------- #
echo -e "Welcome to the BulletBot installer\n"
cd "$execution_path"
export green
export cyan
export red
export nc

while true; do
    # Contains all the possible files/directories that are associated with
    # BulletBot (only files/directories located in the BulletBot root directory)
    files=("installers/" "linux-master-installer.sh" "package-lock.json" \
        "package.json" "tsconfig.json" "src/" "media/" "README.md" "out/")
    
    # Creates a system user named 'bulletbot' if it does not exists, then creates a 
    # home directory for it
    if ! id -u bulletbot &>/dev/null; then
        echo "${red}System user 'bulletbot' does not exists${nc}" >&2
        echo "Creating system user 'bulletbot'..."
        adduser --system bulletbot --ingroup admin || {
            echo "${red}Failed to create 'bulletbot'${nc}" >&2
            exit 1
        }
        echo "Moving files/directories associated to BulletBot to '/home/bulletbot'..."
        mv -f "${files[@]}" /home/bulletbot 2>/dev/null
        chown bulletbot:admin -R /home/bulletbot
        cd /home/bulletbot
    # Creates bulletbot's home directory if it does not exist
    elif [ ! -d /home/bulletbot ]; then
        echo "${red}bulletbot's home directory does not exists${nc}" >&2
        echo "Creating '/home/bulletbot'..."
        mkdir /home/bulletbot
        echo "Moving files/directories associated to BulletBot to '/home/bulletbot'..."
        mv -f "${files[@]}" /home/bulletbot 2>/dev/null
        chown bulletbot:admin -R /home/bulletbot
        cd /home/bulletbot
    fi

    # Checks to see if it is necessary to download BulletBot
    if [[ -d src || ! -d out ]]; then
        if [[ -d src && ! -d out ]]; then
            echo "${cyan}The uncompiled code for BulletBot is currently on your" \
                "system. The master installer does not compile typescript into" \
                "JS, so in order to continue, please download the compiled code" \
                "using option 1.${nc}"
        elif [[ ! -d src && ! -d out ]]; then
            echo "${cyan}BulletBot has not been downloaded. In order to continue," \
                "please download BulletBot using option 1.${nc}"
        fi
        echo "1. Download BulletBot"
        echo "2. Stop and exit script"
        read option
        case $option in
            1)
                download_bb
                clear
                ;;
            2)
                echo -e "\nExiting..."
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not a valid option${nc}" >&2
                continue
                ;;
        esac
    # If any of the prerequisites are not installed or set up, it will require the
    # user to do so
    elif (! hash mongod || ! hash nodejs || ! hash node || ! hash npm || [[ ! -f \
            out/bot-config.json || ! -d node_modules ]]) &>/dev/null; then
        echo "${cyan}Some or all prerequisites are not installed. Due to this, all" \
            "options to run BulletBot have been hidden until the prerequisites are" \
            "installed and setup.${nc}"
        echo "1. Download/update BulletBot"

        if ! hash mongod &>/dev/null; then
            echo "2. Install MongoDB ${red}(Not installed and setup)${nc}"
        else
            echo "2. Install MongoDB ${green}(Already installed but it might" \
                "not be set up)${nc}"
        fi
        
        if (! hash nodejs || ! hash node || ! hash npm) &>/dev/null; then
            echo "3. Install npm and nodejs (will also perform the same actions option" \
            "4) ${red}(Not installed)${nc}"
        else
            echo "3. Install npm and nodejs (will also perform the same actions option" \
            "4) ${green}(Already installed)${nc}"
        fi

        if [[ ! -d node_modules ]] &>/dev/null; then
            echo "4. Install packages and dependencies with npm ${red}(Not" \
                "installed)${nc}"
        else
            echo "4. Install packages and dependencies with npm ${green}(Already" \
                "installed)${nc}"
        fi

        if [ ! -f out/bot-config.json ]; then
            echo "5. Setup BulletBot config file (contains bot key, etc.)${red}" \
                "(Not setup)${nc}"
        else
            echo "5. Setup BulletBot config file (contains bot key, etc.)${green}" \
                "(Already installed)${nc}"
        fi

        echo "6. Stop and exit script"
        read option
        case $option in
            1)
                download_bb
                clear
                ;;
            2)
                bash installers/linux/setup/mongodb-setup.sh
                clear
                ;;
            3)
                export option
                bash installers/linux/nodejs-installer.sh
                clear
                ;;
            4)
                export option
                bash installers/linux/nodejs-installer.sh
                clear
                ;;
            5)
                export tag
                bash installers/linux/setup/bot-config-setup.sh
                clear
                ;;
            6)
                echo -e "\nExiting..."
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not a valid option${nc}" >&2
                continue
                ;;
        esac
    # If all required files/services for BulletBot to start/run in the background
    # with auot restart...
    elif ($start_script_exists && $bullet_service_exists &&
            $start_service_exists) 2>/dev/null; then
        echo "1. Download/update BulletBot and auto restart files/services"
        echo "2. Run BulletBot in background"
        echo "3. Run BulletBot in current session"
        echo "4. Run BulletBot in background with auto restart"
        echo "5. Create new bot config file (replaces current config file)"
        echo "6. Stop and exit script"
        read option
        case $option in
            1)
                download_bb
                clear
                ;;
            2)
                bash installers/linux/bb-start-modes/run-in-background.sh
                clear
                ;;
            3)
                bash installers/linux/bb-start-modes/run-in-current-session.sh
                clear
                ;;
            4)
                bash installers/linux/bb-start-modes/run-in-background-autorestart.sh
                clear
                ;;
            5)
                export tag
                bash installers/linux/setup/bot-config-setup.sh
                ;;
            6)
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not a valid option${nc}" >&2
                continue
                ;;
        esac
    else
        echo "${cyan}The required files to run BulletBot with auto restart" \
            "on server reboot are not setup. Due to this, that option has been" \
            "hidden until it is set up${nc}"
        echo "1. Download/update BulletBot"
        echo "2. Run BulletBot in background"
        echo "3. Run BulletBot in current session"
        echo "4. Setup auto restart"
        echo "5. Create new bot config file (replaces current config file)"
        echo "6. Stop and exit script"
        read option
        case $option in
            1)
                download_bb
                clear
                ;;
            2)
                bash installers/linux/bb-start-modes/run-in-background.sh
                clear
                ;;
            3)
                bash installers/linux/bb-start-modes/run-in-current-session.sh
                clear
                ;;
            4)
                bash installers/linux/setup/autorestart-setup.sh
                clear
                ;;
            5)
                export tag
                bash installers/linux/setup/bot-config-setup.sh
                ;;
            6)
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not a valid option${nc}" >&2
                continue
                ;;
        esac
    fi
done
