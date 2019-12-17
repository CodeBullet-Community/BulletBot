#!/bin/bash

# ######################################################################### #
#                                                                           #
# centos-rhel-installer.sh                                                  #
# ------------------------                                                  #
# The sub-master installer that is used on the CentOS and RHEL flavor of    #
# linux.                                                                    #
#                                                                           #
# Note: All variables not defined in this script, are exported from         #
# linux-master-installer.sh                                                 #
#                                                                           #
# ######################################################################### #


# ---------------------------------------- #
# VARIABLES USED ALL THROUGHOUT THE SCRIPT #
# ---------------------------------------- #
home="/home/bulletbot"
start_script_exists="/home/bulletbot/bullet-mongo-start.sh"
bullet_service_exists="/lib/systemd/system/bulletbot.service"
start_service_exists="/lib/systemd/system/bullet-mongo-start.service"
# Contains all of the files/directories that are associated with BulletBot
# (only files/directories located in the BulletBot root directory)
files=("installers/" "linux-master-installer.sh" "package-lock.json" \
    "package.json" "tsconfig.json" "src/" "media/" "README.md" "out/" \
    "CODE_OF_CONDUCT.md" "CONTRIBUTING.md" "LICENSE")


# ----------------------------------- #
# FUNCTION USED ALL THROUGHOUT SCRIPT #
# ----------------------------------- #
# This function deals with downloading BulletBot (the latest release from github)
# and replacing/updating the existing code for BulletBot (if there is any)
download_bb() {
    clear
    printf "We will now download the compiled version of the newest release. "
    read -p "Press [Enter] to begin."
    
    if [[ $bullet_status = "active" ]]; then
        # B.1. $exists = true when bulletbot.service is active, and is used to
        # to indicate to the user that the service was stopped and that
        # they will need to start the service
        exists="true"
        echo "Stopping bulletbot.service..."
        systemctl stop bulletbot.service || {
            echo "${red}Failed to stop bulletbot.service" >&2
            echo "${cyan}Manually stop bulletbot.service before continuing:" \
                "sudo systemctl stop bulletbot.service${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    fi
    
    # Installs curl if it isn't already
    if ! hash curl &>/dev/null; then
        echo "${yellow}curl is not installed${nc}"
        echo "Installing curl..."
        yum -y install curl || {
            echo "${red}Failed to install curl" >&2
            echo "${cyan}curl must be installed in order to continue${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    fi
    
    tag=$(curl -s https://api.github.com/repos/CodeBullet-Community/BulletBot/releases/latest \
        | grep -oP '"tag_name": "\K(.*)(?=")')
    latest_release="https://github.com/CodeBullet-Community/BulletBot/releases/download/${tag}/BulletBot.zip"
    
    # Installs wget if it isn't already
    if ! hash wget &>/dev/null; then
        echo "${yellow}wget is not installed${nc}"
        echo "Installing wget..."
        yum -y install wget || {
            echo "${red}Failed to install wget" >&2
            echo "${cyan}wget must be installed in order to continue${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # Installs unzip if it isn't already
    if ! hash unzip &>/dev/null; then
        echo "${yellow}unzip is not installed${nc}"
        echo "Installing unzip..."
        yum -y install unzip || {
            echo "${red}Failed to install unzip" >&2
            echo "${cyan}unzip must be installed in order to continue${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # A.1. If the uncompiled code for BulletBot exists instead of the compiled
    # code...
    if [ -d src ]; then
        # Moves/saves bot-config.json, if it exists, to 'tmp/'
        if [ -f src/bot-config.json ]; then
            mkdir tmp
            mv src/bot-config.json tmp/ || {
                echo "${red}Failed to move bot-config.json to 'tmp/'" >&2
                echo "${cyan}Please move it manually before continuing${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi

        echo "Removing unneeded files..."
        if [ -d src ]; then rm -r src/; fi
        if [ -d media ]; then rm -r media/; fi
        if [ -f tsconfig.json ]; then rm tsconfig.json; fi
    fi
    
    echo "Downloading latest release..."
    wget -N "$latest_release" || {
        echo "${red}Failed to download the latest release" >&2
        echo "${cyan}Either resolve the issue (recommended) or download the" \
            "latest release from github${nc}"
        echo -e "\nExiting..."
        exit 1
    }
    
    echo "Unzipping BulletBot.zip..."
    unzip -o BulletBot.zip
    echo "Removing BulletBot.zip..."
    rm BulletBot.zip

    # A.1.
    # Moves bot-config.json to 'out/'
    if [ -f tmp/bot-config.json ]; then
        mv tmp/bot-config.json out/ || {
            echo "${red}Failed to move bot-config.json to 'out/'" >&2
            echo "${yellow}Before starting BulletBot, you will have to manually" \
                "move bot-config.json from 'tmp/' to 'out/'${nc}"
        }
        rm -r tmp/
    fi

    echo "Creating/updating bulletbot.service..."
    echo "[Unit]
Description=A service to start BulletBot after a crash or system reboot
After=network.target mongod.service

[Service]
User=bulletbot
ExecStart=/usr/bin/node ${home}/out/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target" > /lib/systemd/system/bulletbot.service 

    # If you are currently using run mode: Run BulletBot in the background with
    # auto-restart...
    if [[ -f $start_script_exists && -f $start_service_exists ]] 2>/dev/null; then
        echo "Updating startup script and service..."
        ./installers/Linux_Universal/autorestart/autorestart-updater.sh
    fi
    
    echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R "$home"
    echo -e "\n${green}Finished downloading and updating BulletBot${nc}"
    
    # B.1.
    if [[ $exists ]]; then
        echo "${cyan}NOTE: bulletbot.service was stopped to update BulletBot" \
            "and has to be started using the run modes in the installer" \
            "menu${nc}"
    fi

    read -p "Press [Enter] to apply any existing changes to the installer"
    clear
    source installers/CentOS-RHEL/centos-rhel-installer.sh
}


# --------- #
# MAIN CODE #
# --------- #
echo -e "Welcome to the BulletBot CentOS/RHEL installer\n"

while true; do
    bullet_status=$(systemctl is-active bulletbot.service)

    # Creates a system user named 'bulletbot', if it does not already exist, then
    # creates a home directory for it
    if ! id -u bulletbot &>/dev/null; then
        echo "${yellow}System user 'bulletbot' does not exist${nc}" >&2
        echo "Creating system user 'bulletbot'..."
        useradd --system -Um -k /dev/null bulletbot || {
            echo "${red}Failed to create 'bulletbot'" >&2
            echo "${cyan}System user 'bulletbot' must exist in order to continue${nc}"
            echo -e "\nExiting..."
            exit 1
        }
        echo "Changing permissions of '/home/bulletbot'"
        # Permissions for the home directory have to be changed, else an error
        # will be produced when trying to install the node_module
        chmod 755 "$home"

        echo "Moving files/directories associated to BulletBot to '$home'..."
        for dir in "${files[@]}"; do
            # C.1. If two directories with the same name exist in $home and the
            # current dir...
            if [[ -d "${home}/${dir}" && -d $dir ]]; then
                # D.1. Removes the directory in $home because an error would
                # occur otherwise when moving $dir to $home
                rm -rf "${home}/${dir}"
            fi
            # C.1. and D.1. are done because a directory can't overwrite
            # another directory that contains files
            mv -f "$dir" "$home" 2>/dev/null
        done

        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R "$home"
        cd "$home"
    # Creates bulletbot's home directory if it does not exist
    elif [[ ! -d $home ]]; then
        echo "${yellow}bulletbot's home directory does not exist${nc}" >&2
        echo "Creating '$home'..."
        mkdir "$home"

        echo "Moving files/directories associated to BulletBot to '$home'..."
        for dir in "${files[@]}"; do
            # C.1.
            if [[ -d "${home}/${dir}" && -d $dir ]]; then
                # D.1.
                rm -rf "${home}/${dir}"
            fi
            mv -f "$dir" "$home" 2>/dev/null
        done

        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R "$home"
        cd "$home"
    fi

    if [[ $PWD != "/home/bulletbot" ]]; then
        echo "Moving files/directories associated to BulletBot to '$home'..."
        for dir in "${files[@]}"; do
            # C.1.
            if [[ -d "${home}/${dir}" && -d $dir ]]; then
                # D.1.
                rm -rf "${home}/${dir}"
            fi
            mv -f "$dir" "$home" 2>/dev/null
        done

        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R "$home"
        cd "$home"
    fi   

    # Checks to see if it is necessary to download BulletBot (the most recent
    # compiled release)
    if [[ -d src || ! -d out ]]; then
        if [[ -d src && ! -d out ]]; then
            echo "${cyan}The uncompiled version of BulletBot's code is currently" \
                "on your system. This installer does not compile typescript into" \
                "javascript. In order to continue, please download the most" \
                "recent compiled release using option 1.${nc}"
        elif [[ ! -d src && ! -d out ]]; then
            echo "${cyan}BulletBot has not been downloaded. To continue," \
                "please download BulletBot using option 1.${nc}"
        fi

        echo "1. Download BulletBot"
        echo "2. Stop and exit script"
        read option
        case "$option" in
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
    # user to install them using the options below
    elif (! hash mongod || ! hash node || ! hash npm || [[ ! -f \
            out/bot-config.json || ! -d node_modules ]]) &>/dev/null; then
        echo "${cyan}Some or all prerequisites are not installed. Due to this, all" \
            "options to run BulletBot have been hidden until the prerequisites are" \
            "installed and setup.${nc}"
        echo "1. Download/update BulletBot"

        if ! hash mongod &>/dev/null; then
            echo "2. Install MongoDB ${red}(Not installed)${nc}"
        else
            echo "2. Install MongoDB ${green}(Already installed)${nc}"
        fi
        
        if (! hash node || ! hash npm) &>/dev/null; then
            echo "3. Install Node.js (will also perform the actions of option 4)" \
               "${red}(Not installed)${nc}"
        else
            echo "3. Install Node.js (will also perform the actions of option 4)" \
                "${green}(Already installed)${nc}"
        fi

        if [[ ! -d node_modules ]] &>/dev/null; then
            echo "4. Install required packages and dependencies ${red}(Not" \
                "installed)${nc}"
        else
            echo "4. Install required packages and dependencies ${green}(Already" \
                "installed)${nc}"
        fi

        if [ ! -f out/bot-config.json ]; then
            echo "5. Set up BulletBot config file ${red}(Not setup)${nc}"
        else
            echo "5. Set up BulletBot config file ${green}(Already setup)${nc}"
        fi

        echo "6. Stop and exit script"
        read option
        case "$option" in
            1)
                download_bb
                clear
                ;;
            2)
                ./installers/CentOS-RHEL/mongodb-installer.sh
                clear
                ;;
            3)
                export option
                ./installers/CentOS-RHEL/nodejs-installer.sh
                clear
                ;;
            4)
                export option
                ./installers/CentOS-RHEL/nodejs-installer.sh
                clear
                ;;
            5)
                export bullet_status
                ./installers/Linux_Universal/setup/bot-config-setup.sh
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
    else 
        if [[ -f $start_script_exists && -f $start_service_exists &&
                -f $bullet_service_exists && $bullet_status = "active" ]]; then
            echo "1. Download/update BulletBot and auto-restart files/services"
            echo "2. Run BulletBot in the background"
            echo "3. Run BulletBot in the background with auto-restart${green}" \
                "(Running in this mode)${nc}"
        elif [[ -f $start_script_exists && -f $start_service_exists &&
                -f $bullet_service_exists && $bullet_status != "active" ]]; then
            echo "1. Download/update BulletBot and auto-restart files/services"
            echo "2. Run BulletBot in the background"
            echo "3. Run BulletBot in the background with auto-restart${yellow}" \
                "(Setup to use this mode)${nc}"
        elif [[ -f $bullet_service_exists && $bullet_status = "active" ]]; then
            echo "1. Download/update BulletBot"
            echo "2. Run BulletBot in the background ${green}(Running in this mode)${nc}"
            echo "3. Run BulletBot in the background with auto-restart"
        elif [[ -f $bullet_service_exists && $bullet_status != "active" ]]; then
            echo "1. Download/update BulletBot"
            echo "2. Run BulletBot in the background ${yellow}(Setup to use this" \
                "mode)${nc}"
            echo "3. Run BulletBot in the background with auto-restart"
        # If this occurs, that means that bulletbot.service has not been created;
        # though don't worry, as it will be created when you run the bot in any mode
        else
            echo "1. Download/update BulletBot"
            echo "2. Run BulletBot in the background"
            echo "3. Run BulletBot in the background with auto-restart"
        fi

        echo "4. Create new/update BulletBot config file"
        echo "5. Stop and exit script"
        read option
        case "$option" in
            1)
                download_bb
                clear
                ;;
            2)
                export home
                export bullet_status
                export start_script_exists
                export bullet_service_exists
                ./installers/Linux_Universal/bb-start-modes/run-in-background.sh
                clear
                ;;
            3)
                export home
                export bullet_status
                export start_script_exists
                export start_service_exists
                ./installers/Linux_Universal/bb-start-modes/run-in-background-autorestart.sh
                clear
                ;;
            4)
                export bullet_status
                ./installers/Linux_Universal/setup/bot-config-setup.sh
                clear
                ;;
            5)
                echo -e "\nExiting..."
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
