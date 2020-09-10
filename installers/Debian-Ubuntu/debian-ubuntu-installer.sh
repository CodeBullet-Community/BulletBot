#!/bin/bash

################################################################################
#
# The sub-master installer that is used on Debian and Ubuntu Linux
# distributions.
#
# Note: All variables not defined in this script, are exported from
# 'linux-master-installer.sh'.
#
################################################################################
#
# Global [ variables ]
#
################################################################################
#
    home="/home/bulletbot"
    start_script="/home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.sh"
    bulletbot_service="/lib/systemd/system/bulletbot.service"
    start_service="/lib/systemd/system/bullet-mongo-start.service"
    # Contains all of the files/directories that are associated with BulletBot
    # (only files/directories located in the BulletBot root directory)
    files=("installers/" "linux-master-installer.sh" "package-lock.json" \
        "package.json" "tsconfig.json" "src/" "media/" "README.md" "out/" \
        "mkdocs.yml" "mkdocs-requirements.txt" ".gitignore/" "docs/" \
        ".github" "CODE_OF_CONDUCT.md" "CONTRIBUTING.md" "LICENSE")
    bulletbot_service_content="[Unit] \
        \nDescription=Starts BulletBot after a crash or system reboot \
        \nAfter=network.target mongod.service  \
        \n  \
        \n[Service]  \
        \nUser=bulletbot  \
        \nExecStart=/usr/bin/node $home/out/index.js  \
        \nRestart=always  \
        \nRestartSec=3  \
        \nStandardOutput=syslog  \
        \nStandardError=syslog  \
        \nSyslogIdentifier=bulletbot  \
        \n  \
        \n[Install]  \
        \nWantedBy=multi-user.target"

#
################################################################################
#
# [ Functions ]
#
################################################################################
#
    # Changes ownership of new files so that they are owned by the bulletbot
    # system user
    change_ownership() {
        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R "$home"
        cd "$home" || {
            echo "${red}Failed to change working directory to" \
                "'/home/bulletbot'" >&2
            echo "${cyan}Change your working directory to '/home/bulletbot'${nc}"
            echo -e "\nExiting..."
            exit 1
        }
    }

    # Moves BulletBot's code to '/home/bulletbot' if it's executed outside of it's
    # home directory
    move_to_home() {
        echo "Moving files/directories associated with BulletBot to '$home'..."
        for dir in "${files[@]}"; do
            # C.1. If two separate directories with the same name exist in
            # $home and the current dir...
            if [[ -d "${home}/${dir}" && -d $dir ]]; then
                # D.1. Removes the directory in $home because an error would
                # occur when moving $dir to $home
                rm -rf "${home:?}/${dir:?}"
            fi
            # C.1. and D.1. are done because a directory can't overwrite
            # another directory that contains files
            mv -f "$dir" "$home" 2>/dev/null
        done
    }

    # Installs software/applications used by the installers
    required_software() {
        if ! hash "$1" &>/dev/null; then
            echo "${yellow}${1} is not installed${nc}"
            echo "Installing ${1}..."
            apt -y install "$1" || apt -y install $2 || {
                echo "${red}Failed to install $1" >&2
                echo "${cyan}${1} must be installed to continue${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi
    }

    # Downloads and updates BulletBot
    download_bb() {
        clear
        printf "We will now download/update BulletBot. "
        read -p "Press [Enter] to begin."
        
        old_bulletbot=$(date)
        repo="https://github.com/CodeBullet-Community/BulletBot/"


        ########################################################################
        # Error trapping
        ########################################################################
        trap "echo -e \"\n\nScript forcefully stopped\" && clean_up; echo \
            \"Exiting...\" && exit" SIGINT SIGTERM SIGTSTP


        ########################################################################
        # Sub-function
        ######################################################################## 
        # Cleans up any loose ends/left over files
        clean_up() {
            echo "Cleaning up files and directories..."
            if [[ -d tmp ]]; then rm -r tmp; fi

            if [[ ! -d src || ! -f package-lock.json || ! -f package.json ]]; then
                echo "Restoring from 'Old_BulletBot/${old_bulletbot}'"
                cp -rf Old_BulletBot/"$old_bulletbot"/* . && cp -rf Old_BulletBot/"$old_bulletbot"/.* . || {
                    echo "${red}Failed to restore from 'Old_BulletBot'${nc}" >&2
                }
            fi

            echo "Changing ownership of the file(s) in '/home/bulletbot'..."
            chown bulletbot:bulletbot -R "$home"
        }


        ########################################################################
        # Prepping
        ########################################################################
        if [[ $bulletbot_service_status = "active" ]]; then
            # B.1. $bulletbot_service_active = true when 'bulletbot.service' is
            # active, and is used to indicate to the user that the service was
            # stopped and that they will need to start it
            local bulletbot_service_active="true"
            echo "Stopping 'bulletbot.service'..."
            systemctl stop bulletbot.service || {
                echo "${red}Failed to stop 'bulletbot.service'" >&2
                echo "${cyan}You will need to restart 'bulletbot.service' to" \
                    "apply any updates to BulletBot${nc}"
            }
        fi
    

        ########################################################################
        # Checking for required software/applications
        ########################################################################
        required_software "curl"
        required_software "wget"
        required_software "git"
        required_software "gpg2" "gnupg2"


        ########################################################################
        # Creating backups of current code in '/home/BulletBot' then downloads/
        # updates BulletBot
        ########################################################################
        if [[ ! -d Old_BulletBot ]]; then
            echo "Creating 'Old_BulletBot/'..."
            mkdir Old_BulletBot
        fi

        echo "Creating 'Old_BulletBot/${old_bulletbot}'..."
        mkdir Old_BulletBot/"$old_bulletbot"
        # Makes sure that any changes to 'out/bot-config.json' by the user, are
        # made to 'src/bot-config.json' so when the code is compiled, the
        # changes will be passed to the new 'out/bot-config.json'
        if [[ -f out/bot-config.json ]]; then
            cat out/bot-config.json > src/bot-config.json
        fi

        echo "Backing up code to 'Old_BulletBot/${old_bulletbot}'..."
        for dir in "${files[@]}"; do
            if [[ -d $dir || -f $dir ]]; then
                cp -rf "$dir" Old_BulletBot/"$old_bulletbot" || {
                    echo "${red}Failed to backup the code to 'Old_BulletBot/${old_bulletbot}'${nc}" >&2
                }
            fi
        done
     
        if [[ -d .git ]]; then
            git checkout -- \*
            git pull || {
                echo "${red}Failed to update BulletBot${nc}" >&2
                echo "${cyan}Forcefully resetting local changes may resolve" \
                    "the issue that is occuring: 'git fetch --all && git reset" \
                    "--hard origin/release'" 
                clean_up
                echo -e "\nExiting..."
                exit 1
            }
        else
            echo "Downloading BulletBot..."
            git clone --single-branch -b release "$repo" tmp || {
                echo "${red}Failed to download BulletBot${nc}" >&2
                clean_up
                echo -e "\nExiting..."
                exit 1
            }
            mv -f tmp/* . && mv -f tmp/.git* . || {
                echo "${red}Failed to move updated code from 'tmp/' to ." >&2
                echo "${cyan}Manually move all the files from tmp to .${nc}"
                echo -e "\nExiting..."
                exit 1
            }
            rm -rf tmp
        fi
        
        # Checks if it's possible to compile code
        if (! hash tsc || ! hash node) &>/dev/null || [[ ! -f src/bot-config.json ]]; then
            echo "Skipping typescript compilation..."
        else
            echo "Compiling code..."
            export NODE_OPTIONS="--max-old-space-size=600"
            tsc || {
                echo "${red}Failed to compile code${nc}" >&2
                echo -e "\nExiting..."
                exit 1
            }
            echo -e "\n${cyan}If there are any errors, resolve whatever issue" \
                "is causing them, then attempt to compile the code again\n${nc}"
        fi

        if [[ -f $bulletbot_service ]]; then
            echo "Updating 'bulletbot.service'..."
            local create_or_update="update"
        else
            echo "Creating 'bulletbot.service'..."
            local create_or_update="create"
        fi
        # TODO: Have the services updated with any new code the first time
        # around, instead of the second time around (you have to run the
        # download option twice before it will actually update the services
        # due to the placement of the code)
        echo -e "$bulletbot_service_content" > "$bulletbot_service" || {
            echo "${red}Failed to $create_or_update 'bulletbot.service'${nc}" >&2
            local b_s_update="Failed"
        }


        ########################################################################
        # Cleaning up and presenting results...
        ########################################################################
        echo "Changing ownership of the file(s) added to '/home/bulletbot/'..."
        chown bulletbot:bulletbot -R "$home"
        echo -e "\n${green}Finished downloading/updating BulletBot${nc}"
        
        if [[ $b_s_update ]] ;then
            echo "${yellow}WARNING: Failed to $create_or_update 'bulletbot.service'${nc}"
        fi

        # B.1.
        if [[ $bulletbot_service_active ]]; then
            echo "${cyan}NOTE: 'bulletbot.service' was stopped to update" \
                "BulletBot and has to be started using the run modes in the" \
                "installer menu${nc}"
        fi

        read -p "Press [Enter] to apply any existing changes to the installers"
        clear
        exec "$master_installer"
    }

#
################################################################################
#
# [ Main ] code
#
################################################################################
#
    echo -e "Welcome to the BulletBot Debian/Ubuntu installer\n"

    while true; do
        # TODO: Numerics for $bulletbot_service_status like $start_service_status???
        bulletbot_service_status=$(systemctl is-active bulletbot.service)
        start_service_status=$(systemctl is-enabled --quiet bullet-mongo-start.service \
            2>/dev/null; echo $?)


        ########################################################################
        # Makes sure that the system user 'bulletbot' and the home directory
        # '/home/bulletbot' already exists, and that your working directory is
        # '/home/bulletbot'.
        # 
        # TL;DR: Makes sure that all necessary (important) services, files,
        # directories, and users exist and are in their proper locations.
        ########################################################################
        # Creates a system user named 'bulletbot', if it does not already exist,
        # along with a home directory for it
        if ! id -u bulletbot &>/dev/null; then
            echo "${yellow}System user 'bulletbot' does not exist${nc}" >&2
            echo "Creating system user 'bulletbot'..."
            adduser --system --group bulletbot || {
                echo "${red}Failed to create 'bulletbot'" >&2
                echo "${cyan}System user 'bulletbot' must exist in order to" \
                    "continue${nc}"
                echo -e "\nExiting..."
                exit 1
            }

            move_to_home
            change_ownership
        # Creates bulletbot's home directory if it does not exist
        elif [[ ! -d $home ]]; then
            echo "${yellow}bulletbot's home directory does not exist${nc}" >&2
            echo "Creating '$home'..."
            mkdir "$home"

            move_to_home
            change_ownership
        fi

        if [[ $PWD != "/home/bulletbot" ]]; then
            move_to_home
            change_ownership
        fi   

        # E.1. Creates 'bulletbot.service', if it does not exist
        if [[ ! -f $bulletbot_service ]]; then
            echo "Creating 'bulletbot.service'..."
            echo -e "$bulletbot_service_content" > "$bulletbot_service" || {
                echo "${red}Failed to create 'bulletbot.service'" >&2
                echo "${cyan}This service must exist for BulletBot to work${nc}"
                echo -e "\nExiting..."
                exit 1
            }
            # Reloads systemd daemons to account for the added service
            systemctl daemon-reload
        fi
        

        ########################################################################
        # User options for installing perquisites, downloading BulletBot, and
        # starting BulletBot in different run modes
        ########################################################################
        # Checks to see if it is necessary to download BulletBot
        if [[ ! -d src && ! -d out ]]; then
            echo "${cyan}BulletBot is not downloaded. To continue, please" \
                "download BulletBot via option 1.${nc}"

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
                    echo "${red}Invalid input: '$option' is not a valid" \
                        "option${nc}" >&2
                    continue
                    ;;
            esac
        # If any of the prerequisites are not installed or set up, the user will
        # be required to install them using the options below
        elif (! hash mongod || ! hash node || ! hash npm || [[ ! -f \
                out/bot-config.json || ! -d node_modules ]]) &>/dev/null; then
            echo "${cyan}Some or all of the prerequisites are not installed." \
                "Until they are all installed and set up, all options to run" \
                "BulletBot have been disabled.${nc}"
            echo "1. Download/update BulletBot"

            if ! hash mongod &>/dev/null; then
                echo "2. Install MongoDB ${red}(Not installed)${nc}"
            else
                echo "2. Install MongoDB ${green}(Already installed)${nc}"
            fi
            
            if (! hash node || ! hash npm) &>/dev/null; then
                echo "3. Install Node.js (will also perform the actions of" \
                    "option 4) ${red}(Not installed)${nc}"
            else
                echo "3. Install Node.js (will also perform the actions of" \
                    "option 4) ${green}(Already installed)${nc}"
            fi

            if [[ ! -d node_modules ]] &>/dev/null; then
                echo "4. Install required packages and dependencies" \
                    "${red}(Already installed)${nc}"
            else
                echo "4. Install required packages and dependencies" \
                    "${green}(Already installed)${nc}"
            fi

            if [[ ! -f src/bot-config.json ]]; then
                echo "5. Set up BulletBot config file ${red}(Not setup)${nc}"
            else
                echo "5. Set up BulletBot config file ${green}(Already" \
                    "setup)${nc}"
            fi

            if [[ ! -d out ]]; then
                echo "6. Compile code ${red}(Not compiled)${nc}"
            else
                echo "6. Compile code ${green}(Already compiled)${nc}"
            fi

            echo "7. Stop and exit script"
            read option
            case "$option" in
                1)
                    download_bb
                    clear
                    ;;
                2)
                    ./installers/Debian-Ubuntu/mongodb-installer.sh
                    clear
                    ;;
                3)
                    export option
                    ./installers/Debian-Ubuntu/nodejs-installer.sh
                    clear
                    ;;
                4)
                    export option
                    ./installers/Debian-Ubuntu/nodejs-installer.sh
                    clear
                    ;;
                5)
                    export bulletbot_service_status
                    ./installers/Linux_Universal/bot-config-setup.sh
                    clear
                    ;;
                6)
                    clear
                    if [[ ! -f src/bot-config.json ]]; then
                        echo "${yellow}'bot-config.json' doesn't exist. Before" \
                            "compiling the code, create 'bot-config.json' via" \
                            "option 5 on the installer menu.${nc}"
                        continue
                    fi
                    
                    printf "We will now compile the bulletbot code. "
                    read -p "Press [Enter] to continue."
                    echo "Compiling code..."
                    export NODE_OPTIONS="--max-old-space-size=600"
                    tsc || {
                        echo "${red}Failed to compile code${nc}" >&2
                        read -p "Press [Enter] to return to the installer menu"
                        clear
                        continue
                    }

                    echo -e "\n${cyan}If there are any errors, resolve whatever issue is" \
                        "causing them, then attempt to compile the code again\n${nc}"
                    
                    read -p "Press [Enter] to return to the installer menu"
                    clear
                    ;;
                7)
                    echo -e "\nExiting..."
                    exit 0
                    ;;
                *)
                    clear
                    echo "${red}Invalid input: '$option' is not a valid" \
                        "option${nc}" >&2
                    continue
                    ;;
            esac
        # BulletBot run mode options
        else 
            echo "${cyan}Note: Running BulletBot in the same mode it's currently" \
                "running in, will restart the bot${nc}"

            if [[ $start_service_status = 0 && -f $bulletbot_service && 
                    $bulletbot_service_status = "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart${green}" \
                    "(Running in this mode)${nc}"
            elif [[ $start_service_status = 0 && -f $bulletbot_service && 
                    $bulletbot_service_status != "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart${yellow}" \
                    "(Setup to use this mode)${nc}"
            elif [[ -f $bulletbot_service && $bulletbot_service_status = "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background ${green}(Running in" \
                    "this mode)${nc}"
                echo "3. Run BulletBot in the background with auto-restart"
            elif [[ -f $bulletbot_service && $bulletbot_service_status != "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background ${yellow}(Setup to" \
                    "use this mode)${nc}"
                echo "3. Run BulletBot in the background with auto-restart"
            # If this occurs, that means that 'bulletbot.service' has not been
            # created for some reason
            else
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart"
            fi

            echo "4. Stop BulletBot"
            echo "5. Stop and exit script"
            read option
            case "$option" in
                1)
                    download_bb
                    clear
                    ;;
                2)
                    export home
                    export bulletbot_service_status
                    export start_script
                    export start_service_status
                    export bulletbot_service
                    ./installers/Linux_Universal/bb-start-modes/run-in-background.sh
                    clear
                    ;;
                3)
                    export home
                    export bulletbot_service_status
                    export start_script
                    export start_service_status
                    export start_service
                    ./installers/Linux_Universal/bb-start-modes/run-in-background-auto-restart.sh
                    clear
                    ;;
                4)
                    export bulletbot_service_status
                    ./installers/Linux_Universal/bb-stop.sh
                    clear
                    ;;
                5)
                    echo -e "\nExiting..."
                    exit 0
                    ;;
                *)
                    clear
                    echo "${red}Invalid input: '$option' is not a valid" \
                        "option${nc}" >&2
                    continue
                    ;;
            esac
        fi
    done
