#!/bin/bash

# ---------------------------------------- #
# VARIABLES USED ALL THROUGHOUT THE SCRIPT #
# ---------------------------------------- #
yellow=$'\033[1;33m'
green=$'\033[0;32m'
cyan=$'\033[0;36m'
red=$'\033[1;31m'
nc=$'\033[0m'
home="/home/bulletbot"
start_script_exists="/home/bulletbot/bullet-mongo-start.sh"
bullet_service_exists="/lib/systemd/system/bulletbot.service"
start_service_exists="/lib/systemd/system/bullet-mongo-start.service"
# Contains all of the files/directories that are associated with BulletBot
# (only files/directories located in the BulletBot root directory)
files=("installers/" "linux-master-installer.sh" "package-lock.json" \
    "package.json" "tsconfig.json" "src/" "media/" "README.md" "out/" \
    "CODE_OF_CONDUCT.md" "CONTRIBUTING.md" "LICENSE")

# Checks to see if this script was executed with root privilege
if [[ $EUID -ne 0 ]]; then 
    echo "${red}Please run this script as root or with root privilege${nc}"
    echo -e "\nExiting..."
    exit 1
fi


# ------------------------------------------------- #
# FUNCTION ONLY USED AT THE BEGINNING OF THE SCRIPT #
# ------------------------------------------------- #
# Identify the operating system, version number, architecture, and bit type
# (32 or 64)
detect_os_ver_arch_bits() {
    arch=$(uname -m | sed 's/x86_//;s/i[3-6]86/32/')
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        os=$ID
        # Version: x.x.x...
        ver=$VERSION_ID
        # Version: x
        sver=$(echo $ver | grep -oP "[0-9]+" | head -1 )
        codename=$VERSION_CODENAME
    else
        os=$(uname -s)
        ver=$(uname -r)
    fi
    case $(uname -m) in
	x86_64)
	    bits="64"
	    ;;
	i*86)
	    bits="32"
	    ;;
	armv*)
	    bits="32"
	    ;;
	*)
	    bits="?"
	    ;;
	esac
	case $(uname -m) in
	x86_64)
	    arch="x64"  # or AMD64 or Intel64 or whatever
	    ;;
	i*86)
	    arch="x86"  # or IA32 or Intel32 or whatever
	    ;;
	esac
} 


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
        exists="true"
        echo "Stopping 'bulletbot.service'..."
        systemctl stop bulletbot.service || {
            echo "${red}Failed to stop 'bulletbot.service'" >&2
            echo "${cyan}Manually stop bulletbot.service before continuing${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    fi
    
    # Installs curl if it isn't already
    if ! hash curl &>/dev/null; then
        echo "${yellow}'curl' is not installed${nc}"
        echo "Installing 'curl'..."
        apt -y install curl || {
            echo "${red}Failed to install 'curl'${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
    fi
    
    # TODO: Change the urls below when everything is moved to new repo
    tag=$(curl -s https://api.github.com/repos/StrangeRanger/Bull/releases/latest \
        | grep -oP '"tag_name": "\K(.*)(?=")')
    latest_release="https://github.com/StrangeRanger/Bull/releases/download/${tag}/BulletBot.zip"
    
    # Installs wget if it isn't already
    if ! hash wget &>/dev/null; then
        echo "${yellow}'wget' is not installed${nc}"
        echo "Installing 'wget'..."
        apt -y install wget || {
            echo "${red}Failed to install 'wget'${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # Installs curl if it isn't already
    if ! hash curl &>/dev/null; then
        echo "${yellow}'curl' is not installed${nc}"
        echo "Installing 'curl'..."
        apt -y install curl || {
            echo "${red}Failed to install 'curl'${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # Installs unzip on system if it isn't already
    if ! hash unzip &>/dev/null; then
        echo "${yellow}unzip is not installed${nc}"
        echo "Installing unzip..."
        apt -y install unzip || {
            echo "${red}Failed to install unzip${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
    fi

    # A.1. If uncompiled code exists instead of the compiled code...
    if [ -d src ]; then
        # Moves/saves 'bot-config.json', if it exists, to 'tmp/'
        if [ -f src/bot-config.json ]; then
            mkdir tmp
            mv src/bot-config.json tmp/ || {
                echo "${red}Failed to move 'bot-config.json' to 'tmp/'" >&2
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
    wget -N $latest_release || {
        echo "${red}Failed to download the latest release${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    }
    
    echo "Unzipping BulletBot.zip..."
    unzip -o BulletBot.zip
    echo "Removing BulletBot.zip..."
    rm BulletBot.zip

    # A.1.
    # Moves 'bot-config.json' to 'out/'
    if [ -f tmp/bot-config.json ]; then
        mv tmp/bot-config.json out/ || {
            echo "${red}Failed to move 'bot-config.json' to 'out/'" >&2
            echo "${cyan}Before starting the BulletBot, you will have to manually" \
                "move 'bot-config.json' from 'tmp/' to 'out/'${nc}"
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

    if [[ -f $start_script_exists && -f $start_service_exists ]] 2>/dev/null; then
        echo "Updating startup script and service..."
        bash installers/linux/autorestart/autorestart-updater.sh
    fi
    
    echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R $home
    echo -e "\n${green}Finished downloading and updating BulletBot${nc}"
    
    # If statement uses double brackets because '$exists' is only declared under
    # certain conditions (single quotes and no quotes do not work)
    if [[ $exists ]]; then
        echo "${cyan}NOTE: 'bulletbot.service' was stopped to update BulletBot" \
            "and has to be started using the run modes in the master installer" \
            "menu${nc}"
    fi

    read -p "Press [Enter] to apply any existing changes to 'linux-master-installer.sh'"
    clear
    source linux-master-installer.sh
}



# ------------------------------------------------------------- #
# DETECTS WHETHER BULLETBOT AND INSTALLER CAN BE USED ON THE OS #
# ------------------------------------------------------------- #
detect_os_ver_arch_bits

export os ver arch bits codename

if [[ $os = "ubuntu" ]]; then
    case $ver in
        16.04)
            # B.1. MongoDB only works on 64 bit versions of Ubuntu
            if [[ $bits = 64 ]]; then
                supported=true
            else
                supported=false
            fi
            ;;
        18.04)
            # B.1.
            if [[ $bits = 64 ]]; then
                supported=true
            else
                supported=false
            fi
            ;;
        # As of MongoDB 4.2, support for Ubuntu 14.04 has been removed
        *)
            supported=false
            ;;
    esac
else
    supported=false
fi

if [[ $supported = false ]]; then
    echo "SYSTEM INFO"
    echo "Bit type: $bits"
    echo "Architecture: $arch"
    echo "Operating System: $os"
    echo "Operating System Version: $ver"
    echo -e "\n${red}Your operating system does not support the installation," \
        "setup, and/or use of BulletBot${nc}"
    echo -e "\nExiting..."
    exit 1
fi



# --------- #
# MAIN CODE #
# --------- #
echo -e "Welcome to the BulletBot master installer\n"
cd "$(dirname $0)"
# The variables exported are used all throughout this script and the other
# sub-scripts/installers
export yellow
export green
export cyan
export red
export nc

if ! hash jq; then
    echo "${yellow}'jq' is not installed${nc}" >&2
    echo "Installing 'jq'..."
    apt -y install jq || {
        echo "${red}Failed to install 'jq'${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    }
fi

while true; do
    bullet_status=$(systemctl is-active bulletbot.service)

    # Creates a system user named 'bulletbot' if it does not exists, then creates a 
    # home directory for it
    if ! id -u bulletbot &>/dev/null; then
        echo "${yellow}System user 'bulletbot' does not exist${nc}" >&2
        echo "Creating system user 'bulletbot'..."
        adduser --system --group bulletbot || {
            echo "${red}Failed to create 'bulletbot'${nc}" >&2
            echo -e "\nExiting..."
            exit 1
        }
        echo "Moving files/directories associated to BulletBot to '$home'..."
        mv -f "${files[@]}" $home 2>/dev/null
        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R $home
        cd $home
    # Creates bulletbot's home directory if it does not exist
    elif [ ! -d $home ]; then
        echo "${yellow}bulletbot's home directory does not exist${nc}" >&2
        echo "Creating '$home'..."
        mkdir $home
        echo "Moving files/directories associated to BulletBot to '$home'..."
        mv -f "${files[@]}" $home 2>/dev/null
        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R $home
        cd $home
    fi

    if [[ $PWD != "/home/bulletbot" ]]; then
        echo "Moving files/directories associated to BulletBot to '$home'..."
        mv -f "${files[@]}" $home 2>/dev/null
        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R $home
        cd $home
    fi   

    # Checks to see if it is necessary to download BulletBot
    if [[ -d src || ! -d out ]]; then
        if [[ -d src && ! -d out ]]; then
            echo "${cyan}The uncompiled code for BulletBot is currently on your" \
                "system. The master installer does not compile typescript into" \
                "javascript. In order to continue, please download the compiled" \
                "code using option 1.${nc}"
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
    # user to install them using the options below
    elif (! hash mongod || ! hash nodejs || ! hash node || ! hash npm || [[ ! -f \
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
        
        if (! hash nodejs || ! hash node || ! hash npm) &>/dev/null; then
            echo "3. Install NodeJS (will also perform the actions of option 4)" \
               "${red}(Not installed)${nc}"
        else
            echo "3. Install NodeJS (will also perform the actions of option 4)" \
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
            echo "5. Setup BulletBot config file ${red}(Not setup)${nc}"
        else
            echo "5. Setup BulletBot config file ${green}(Already setup)${nc}"
        fi

        echo "6. Stop and exit script"
        read option
        case $option in
            1)
                download_bb
                clear
                ;;
            2)
                bash installers/linux/mongodb-installer.sh
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
                export bullet_status
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
    else 
        if [[ -f $start_script_exists && -f $start_service_exists &&
                -f $bullet_service_exists && $bullet_status = "active" ]]; then
            echo "1. Download/update BulletBot and auto restart files/services"
            echo "2. Run BulletBot in background"
            echo "3. Run BulletBot in background with auto restart${green}" \
                "(Running in this mode)${nc}"
        elif [[ -f $start_script_exists && -f $start_service_exists &&
                -f $bullet_service_exists && $bullet_status != "active" ]]; then
            echo "1. Download/update BulletBot and auto restart files/services"
            echo "2. Run BulletBot in background"
            echo "3. Run BulletBot in background with auto restart${yellow}" \
                "(Set up to use this mode)${nc}"
        elif [[ -f $bullet_service_exists && $bullet_status = "active" ]]; then
            echo "1. Download/update BulletBot"
            echo "2. Run BulletBot in background ${green}(Running in this mode)${nc}"
            echo "3. Run BulletBot in background with auto restart"
        elif [[ -f $bullet_service_exists && $bullet_status != "active" ]]; then
            echo "1. Download/update BulletBot"
            echo "2. Run BulletBot in background ${yellow}(Set up to use this" \
                "mode)${nc}"
            echo "3. Run BulletBot in background with auto restart"
        # If this were to ever occure, something went wrong or something wierd
        # is happening
        else
            echo "1. Download/update BulletBot"
            echo "2. Run BulletBot in background"
            echo "3. Run BulletBot in background with auto restart"
        fi
        echo "4. Create new/update BulletBot config file"
        echo "5. Stop and exit script"
        read option
        case $option in
            1)
                download_bb
                clear
                ;;
            2)
                export bullet_status
                export start_script_exists
                export bullet_service_exists
                bash installers/linux/bb-start-modes/run-in-background.sh
                clear
                ;;
            3)
                export bullet_status
                export start_script_exists
                export start_service_exists
                bash installers/linux/bb-start-modes/run-in-background-autorestart.sh
                clear
                ;;
            4)
                export bullet_status
                bash installers/linux/setup/bot-config-setup.sh
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
