#!/bin/bash

green=$'\033[0;32m'
cyan=$'\033[0;36m'
red=$'\033[1;31m'
nc=$'\033[0m'
execution_path="$(pwd)/$(dirname $0)"


# This function deals with downloading BulletBot (the latest release from github)
# then replacing the existing BulletBot code, if there is any
download_bb() {
    clear
    read -p "We will now download the compiled version of the newest release"
    
    # Installs wget on system if it isn't already
    if ! hash wget &>/dev/null; then
        echo "wget is not installed on system"
        if $root_user; then
            echo "Installing wget"
            apt -y install wget && echo "${green}Successfully installed wget${nc}" || {
                echo "${red}An error occured while trying to install wget${nc}" >&2
                echo -e "\nExiting..."
                exit 1
            }
        else
            echo "Install wget with 'sudo apt install wget' or execute this" \
                "script with sudo"
            echo -e "\nExiting..."
            exit 1
        fi
    fi

    # Installs unzip on system if it isn't already
    if ! hash unzip &>/dev/null; then
        echo "unzip is not installed on system"
        if $root_user; then
            echo "Installing unzip"
            apt -y install wget && echo "${green}Successfully installed unzip${nc}" || {
                echo "${red}An error ocured while trying to install unzip${nc}" >&2
                echo -e "\nExiting..."
                exit 1
            }
        else
            echo "Install wget with 'sudo apt install unzip' or execute this" \
                "script with sudo"
            echo -e "\nExiting..."
            exit 1
        fi
    fi

    # 'out' only exists when the code has ALREADY BEEN compiled
    if [ -f out/bot-config.json ]; then
        mkdir tmp
        mv out/bot-config.json tmp/ || {
            echo "${red}Failed to move 'bot-config.json' to 'tmp/'" >&2
            echo "Please move it manually before continuing${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    # 'src' only exists when the code has NOT been compiled
    elif [ -d src ]; then
        if [ -f src/bot-config.json ]; then
            mkdir tmp
            mv src/bot-config.json tmp/ || {
                echo "${red}Failed to move 'bot-config.json' to 'tmp/'" >&2
                echo "Please move it manually before continuing${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi

        # TODO: Add error catching thing and echo that files and dirs are being removed?
        if [ -d src ]; then rm -r src/; fi
        if [ -d media ]; then rm -r media/; fi
        if [ -f tsconfig.json ]; then rm tsconfig.json; fi
    fi
    
    # TODO: Change the urls below when everything is moved to new repo
    tag=$(curl -s https://api.github.com/repos/StrangeRanger/Bull/releases/latest \
        | grep -oP '"tag_name": "\K(.*)(?=")')
    latest_release="https://github.com/StrangeRanger/Bull/releases/download/${tag}/BulletBot.zip"
    echo "Downloading latest release"
    wget -N $latest_release && echo "${green}Successfully downloaded latest release${nc}" || {
        echo "${red}An error occured while trying to get the latest release${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    }
    
    echo "Unzipping BulletBot.zip"
    unzip -o BulletBot.zip
    echo "Removing BulletBot.zip"
    rm BulletBot.zip
    
    if [ -f tmp/bot-config.json ]; then
        mv tmp/bot-config.json out/ || {
            echo "${red}Failed to move 'bot-config.json' to 'out/'" >&2
            echo "Before starting the bot, you will have to manually move it${nc}"
        }
        rm -r tmp/
    fi

    if $root_user; then
        echo "Changing ownership of installed files"
        chown -R bulletbot:bulletbot *
    fi

    echo ""
    # TODO: Maybe reword?
    read -p "Finished downloading and updating BulletBot"
}


echo -e "Welcome to BulletBot\n"
cd "$execution_path"
if [[ $EUID -ne 0 ]]; then root_user=true; fi

while true; do
    start_script_exists="$(find . -path installers -prune -o -print | grep \
       -i "bullet-mongo-start.sh" &>/dev/null; echo $?)"
    bullet_service_exists=$(systemctl list-units --full --all | grep -Fq \
        "bulletbot.service" &>/dev/null; echo $?)
    start_service_exists=$(systemctl list-units --full --all | grep -Fq \
        "bullet-mongo-start.service" &>/dev/null; echo $?)
    
    # Creates system user 'bulletbot' if it does not exists and then creates a home dir
    # for it
    if (! id -u bulletbot && [ ! -d /home/bulletbot ] || [ ! id -u bulletbot ]) &>/dev/null; then
        echo "${red}System user 'bulletbot' does not exists${nc}" >&2
        echo "Creating system user 'bulletbot' and a home dir for 'bulletbot'"
        if $root_user; then
            adduser --system bulletbot --ingroup admin && echo "{$green}Successfully" \
                "'bulletbot' and its home directory${nc}" || {
                    echo "${red}Failed to create 'bulletbot' and its home directory${nc}" >&2
                }

            if [[ -d src || -d out ]]; then 
                echo "Moving code BulletBot to '/home/bulletbot'"
                mv * /home/bulletbot
            fi
        else
            echo "${red}Please re-run this script with root privileges${nc}"
            exit 1
        fi
    fi

    # Checks to see if uncompiled code is on system instead of the compiled code
    if [[ -d src || ! -d out ]]; then
        if [[ -d src && ! -d out ]]; then
            echo "${cyan}The uncompiled version of the code is currently on your" \
                "system. In order to continue, please download the compiled code" \
                "using option 1.${nc}"
        elif [[ ! -d src && ! -d out ]]; then
            echo "${cyan}BulletBot has not been downloaded to your system"
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
                echo "${red}Invalid input: '$option' is not an option${nc}" >&2
                continue
                ;;
        esac
    # TODO: Maybe change prerequisites to another word
    # TODO: Give different description for each option
    # If one or all of the prerequisites are not installed
    elif (! hash mongod || ! hash nodejs || ! hash node || ! hash npm || [[ ! -f \
            out/bot-config.json || ! -d $(npm root -g) ]]) &>/dev/null; then
        echo "${cyan}Some or all prerequisites are not installed on the system. Due" \
            "to this, all options to run BulletBot have been hidden until the" \
            "prerequisites are installed and setup${nc}"
        echo "1. Download/update BulletBot"

        if ! hash mongod &>/dev/null; then
            echo "2. Install and setup MongoDB ${red}(Not installed and setup)${nc}"
        else
            echo "2. Install and setup MongoDB ${green}(Already installed but it might not be set up)${nc}"
        fi
        
        if (! hash nodejs || ! hash node || ! hash npm) &>/dev/null; then
            echo "3. Install npm and nodejs ${red}(Not installed)${nc}"
        else
            echo "3. Install npm and nodejs ${green}(Already installed)${nc}"
        fi

        if [[ ! -d $(npm root -g) ]] &>/dev/null; then
            echo "4. Install packages and dependencies with npm ${red}(Not installed)${nc}"
        else
            echo "4. Install packages and dependencies with npm ${green}(Already installed)${nc}"
        fi

        if [[ ! -f out/bot-config.json ]]; then
            echo "5. Setup Bullet Bot config file (google API keys, etc.) ${red}(Not setup)${nc}"
        else
            echo "5. Setup Bullet Bot config file (google API keys, etc.) ${green}(Already installed)${nc}"
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
                # TODO: nodejs-installer.sh will take care of installing npm &
                # node and will set node_module
                bash installers/linux/nodejs-installer.sh
                clear
                ;;
            4)
                bash installers/linux/nodejs-installer.sh
                clear
                ;;
            5)
                bash installers/linux/setup/bot-config-setup.sh
                clear
                ;;
            6)
                echo -e "\nExiting..."
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not an option${nc}" >&2
                continue
                ;;
        esac
    # If everything required for bulletbot auotrestart to work has been added...
    elif ($start_script_exists && $bullet_service_exists &&
            $start_service_exists) 2>/dev/null; then
        echo "1. Download/update BulletBot and auto restart"
        echo "2. Run BulletBot in background"
        echo "3. Run BulletBot in current session"
        echo "4. Run BulletBot in background with auto restart"
        echo "5. Stop and exit script"
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
                exit 0
                ;;

            *)
                clear
                echo "${red}Invalid input: '$option' is not an option${nc}" >&2
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
        echo "5. Stop and exit script"
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
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not an option${nc}" >&2
                continue
                ;;
        esac
    fi
done
