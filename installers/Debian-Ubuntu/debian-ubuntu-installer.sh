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
    bullet_service="/lib/systemd/system/bulletbot.service"
    start_service="/lib/systemd/system/bullet-mongo-start.service"
    bullet_mongo_start_config="/home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.local"
    # Contains all of the files/directories that are associated with BulletBot
    # (only files/directories located in the BulletBot root directory)
    files=("installers/" "linux-master-installer.sh" "package-lock.json" \
        "package.json" "tsconfig.json" "src/" "media/" "README.md" "out/" \
        "mkdocs.yml" "mkdocs-requirements.txt" ".gitignore/" "docs/" \
        ".github" "CODE_OF_CONDUCT.md" "CONTRIBUTING.md" "LICENSE")
    bullet_service_content="[Unit] \
        \nDescription=A service to start BulletBot after a crash or system reboot \
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

    # Moves BulletBot's code to '/home/bottius' if it's executed outside of it's
    # home directory
    move_to_home() {
        echo "Moving files/directories associated with Bottius to '$home'..."
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
            apt -y install "$1" || {
                echo "${red}Failed to install $1" >&2
                echo "${cyan}${1} must be installed to continue${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi
    }

    # Downloads the latest release of BulletBot
    download_bb() {
        clear
        printf "We will now download the newest release of BulletBot. "
        read -p "Press [Enter] to begin."
        
        old_bulletbot=$(date)
        tag=$(curl -s https://api.github.com/repos/CodeBullet-Community/BulletBot/releases/latest \
            | grep -oP '"tag_name": "\K(.*)(?=")')
        local latest_release="https://github.com/CodeBullet-Community/BulletBot/releases/download/${tag}/BulletBot.zip"


        ########################################################################
        # Error trapping
        ########################################################################
        trap "echo -e \"\n\nScript forcefully stopped\" && clean_up; echo \
            \"Exiting...\" && exit" SIGINT SIGTERM SIGTSTP


        ########################################################################
        # Sub-function
        ######################################################################## 
        # Copies two config files to a temporary directory that will eventually
        # be moved to their previous locations once the new release is
        # downloaded
        saving_config() {
            bot_conf_move_fail="${cyan}You will need to manually move the file \
to 'out/' after downloading the newest release\nFile location:
'Old_Bulletbot/$old_bulletbot/$1/'${nc}"
            bms_start_move_fail="${cyan}You will need to manually move the file \
to 'installers/Linux_Universal/auto-restart/' after downloading the newest \
release\nFile location: 'installers/Linux_Universal/auto-restart/'${nc}"

            if [[ ! -d tmp ]]; then
                mkdir tmp || {
                    echo "${red}Failed to create 'tmp/'${nc}" >&2
                    echo -e "$bot_conf_move_fail"
                    echo -e "$bms_start_move_fail"
                    return 1
                }
            fi

            cp "$1"/bot-config.json tmp || {
                    echo "${red}Failed to copy 'bot-config.json' to 'tmp/'" >&2
                    echo -e "$bot_conf_move_fail"
            }

            if [[ -f $bullet_mongo_start_config ]]; then
                cp $bullet_mongo_start_config tmp || {
                    echo "${red}Failed to copy 'bullet-mongo-start.local' to 'tmp/'" >&2
                    echo -e "$bms_start_move_fail"
                }
            fi
        }

        # Cleans up any loose ends/left over files
        clean_up() {
            echo "Cleaning up files and directories..."
            if [[ -d tmp ]]; then rm -r tmp; fi
            if [[ -f BulletBot.zip ]]; then rm -r BulletBot.zip; fi

            if [[ ! -d out || ! -f package-lock.json || ! -f package.json ]]; then
                echo "Restoring from 'Old_BulletBot/$old_bulletbot'"
                cp -r Old_BulletBot/"$old_bulletbot"/* . || {
                    echo "${red}Failed to restore from 'Old_BulletBot'${nc}" >&2
                }
            fi

            echo "Changing ownership of the file(s) in '/home/bulletbot'..."
            chown bulletbot:bulletbot -R "$home"
        }


        ########################################################################
        # Prepping
        ########################################################################
        if [[ $bullet_service_status = "active" ]]; then
            # B.1. $bulletbot_service_active = true when 'bulletbot.service' is
            # active, and is used to indicate to the user that the service was
            # stopped and that they will need to start it
            bulletbot_service_active="true"
            echo "Stopping 'bulletbot.service'..."
            systemctl stop bulletbot.service || {
                echo "${red}Failed to stop 'bulletbot.service'" >&2
                echo "${cyan}Manually stop 'bulletbot.service' before" \
                    "continuing${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi
    

        ########################################################################
        # Checking for required software/applications
        ########################################################################
        required_software "curl"
        required_software "wget"
        required_software "unzip"


        ########################################################################
        # Creating backups of current code in '/home/Bottius' then downloads/
        # updates BulletBot
        ########################################################################
        if [[ -f out/bot-config.json ]]; then
            saving_config "out"
        elif [[ -f src/bot-config.json ]]; then
            saving_config "src"

            echo "Removing unneeded files..."
            if [[ -d src ]]; then rm -r src/; fi
            if [[ -f tsconfig.json ]]; then rm tsconfig.json; fi
        fi

        if [[ ! -d Old_BulletBot ]]; then
            echo "Creating 'Old_BulletBot/'..."
            mkdir Old_BulletBot
        fi

        echo "Creating 'Old_BulletBot/$old_bulletbot'..."
        mkdir Old_BulletBot/"$old_bulletbot"

        echo "Moving files/directories associated with BulletBot to 'Old_BulletBot/$old_bulletbot'..."
        for dir in "${files[@]}"; do
            if [[ -d $dir || -f $dir ]]; then
                mv -f "$dir" Old_BulletBot/"$old_bulletbot" || {
                    echo "${red}Failed to move the code to 'Old_Bottius/$old_bulletbot'${nc}" >&2
                }
            fi
        done
        
        echo "Downloading latest release..."
        wget -N "$latest_release" || {
            echo "${red}Failed to download the latest release" >&2
            echo "${cyan}Either resolve the issue (recommended) or download" \
                "the latest release from github${nc}"
            clean_up
            echo -e "\nExiting..."
            exit 1
        }

        echo "Unzipping 'BulletBot.zip'..."
        unzip -o BulletBot.zip || {
            echo "${red}Failed to unzip 'BulletBot.zip'${nc}" >&2
            clean_up
            echo -e "\nExiting..."
            exit 1
        }

        echo "Removing 'BulletBot.zip'..."
        rm BulletBot.zip 2>/dev/null || echo "${red}Failed to remove" \
            "'BulletBot.zip'${nc}" >&2

        if [[ -d tmp ]]; then
            if [[ -f tmp/bot-config.json ]]; then
                mv tmp/bot-config.json out || {
                    echo "${red}Failed to move 'bot-config.json' to 'out/'" >&2
                    echo "${cyan}Before starting BulletBot, you will have to" \
                        "manually move 'bot-config.json' from 'tmp/' to 'out/'${nc}"
                    move_failed="true"
                }
            fi

            if [[ -f tmp/bullet-mongo-start.local ]]; then
                mv tmp/bullet-mongo-start.local /home/bulletbot/installers/Linux_Universal/auto-restart/ || {
                    echo "${red}Failed to move 'bullet-mongo-start.local'" >&2
                    echo "${cyan}Before starting BulletBot, you will have to" \
                        "manually move 'bullet-mongo-start.local' from 'tmp/' to" \
                        "'/home/bulletbot/installers/Linux_Universal/auto-restart'${nc}"
                    move_failed="true"
                }
            fi
    
            # If an error didn't occur while moving the files above...
            if [[ ! $move_failed ]]; then
                rm -r tmp || echo "${red}Failed to remove 'tmp/'${nc}" >&2
            fi
        fi

        if [[ -f $bullet_service ]]; then
            echo "Updating 'bulletbot.service'..."
            local create_or_update_1="update"
        else
            echo "Creating 'bulletbot.service'..."
            local create_or_update_1="create"
        fi
        echo -e "$bullet_service_content" > "$bullet_service" || {
            echo "${red}Failed to $create_or_update_1 'bulletbot.service'${nc}" \
                >&2
            local bb_s_update="Failed"
        }

        if [[ -f $start_service ]]; then
            echo "Updating 'bullet-mongo-start.service'..."
            local create_or_update_2="update"
        else
            echo "Creating 'bullet-mongo-start.service'..."
            local create_or_update_2="create"
        fi
        # TODO: Have the services updated with any new code the first time
        # around, instead of the second time around (you have to run the
        # download option twice before it will actually update the services
        # due to the placement of the code)
        ./installers/Linux_Universal/auto-restart/auto-restart-updater.sh || {
            echo "${red}Failed to $create_or_update_2 'bullet-mongo-start.service'" \
                "${nc}" >&2
            local b_m_s_s_update="Failed"
        }


        ########################################################################
        # Cleaning up and presenting results...
        ########################################################################
        echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
        chown bulletbot:bulletbot -R "$home"
        echo -e "\n${green}Finished downloading/updating BulletBot${nc}"
        
        if [[ $bb_s_update || $b_m_s_s_update ]] ;then
            echo "${yellow}WARNING:"
            if [[ $bb_s_update ]]; then
                printf "    Failed to %s 'bulletbot.service'" "$create_or_update_1"
            fi
            if [[ $b_m_s_s_update ]]; then
                printf "    Failed to %s 'bullet-mongo-start.service'" \
                    "$create_or_update_2"
            fi
            echo "$nc"
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
        # TODO: Numerics for $bullet_service_status like $start_service_status???
        bullet_service_status=$(systemctl is-active bulletbot.service)
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
        # then creates a home directory for it
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
        if [[ ! -f $bullet_service ]]; then
            echo "Creating 'bulletbot.service'..."
            echo -e "$bullet_service_content" > "$bullet_service" || {
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
        # Checks to see if it is necessary to download Bottius
        if [[ -d src || ! -d out ]]; then
            if [[ -d src && ! -d out ]]; then
                echo "${cyan}The uncompiled version of BulletBot's code is" \
                    "currently on your system and this installer does not" \
                    "compile typescript into javascript. In order to continue," \
                    "please download the most recent compiled release using" \
                    "option 1.${nc}"
            elif [[ ! -d src && ! -d out ]]; then
                echo "${cyan}BulletBot is not downloaded. To continue," \
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
            
            if (! hash node || ! hash npm || ! hash nodejs) &>/dev/null; then
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

            if [[ ! -f out/bot-config.json ]]; then
                echo "5. Set up BulletBot config file ${red}(Not setup)${nc}"
            else
                echo "5. Set up BulletBot config file ${green}(Already" \
                    "setup)${nc}"
            fi

            echo "6. Stop and exit script"
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
                    export bullet_service_status
                    ./installers/Linux_Universal/bot-config-setup.sh
                    clear
                    ;;
                6)
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
            # E.1.
            if [[ ! -f $start_script ]]; then
                echo "${yellow}WARNING: 'bullet-mongo-start.sh' does not" \
                    "exist and will prevent BulletBot from running with" \
                    "auto-restarting on system reboot${nc}"
            fi

            echo "${cyan}Note: Running BulletBot in the same mode it's currently" \
                "running in, will restart the bot${nc}"

            if [[ $start_service_status = 0 && -f $bullet_service && 
                    $bullet_service_status = "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart${green}" \
                    "(Running in this mode)${nc}"
            elif [[ $start_service_status = 0 && -f $bullet_service && 
                    $bullet_service_status != "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart${yellow}" \
                    "(Setup to use this mode)${nc}"
            elif [[ -f $bullet_service && $bullet_service_status = "active" ]]; then
                echo "1. Download/update BulletBot"
                echo "2. Run BulletBot in the background ${green}(Running in" \
                    "this mode)${nc}"
                echo "3. Run BulletBot in the background with auto-restart"
            elif [[ -f $bullet_service && $bullet_service_status != "active" ]]; then
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
            echo "5. Create new/update BulletBot config file"
            echo "6. Stop and exit script"
            read option
            case "$option" in
                1)
                    download_bb
                    clear
                    ;;
                2)
                    export home
                    export bullet_service_status
                    export start_script
                    export start_service_status
                    export bullet_service
                    ./installers/Linux_Universal/bb-start-modes/run-in-background.sh
                    clear
                    ;;
                3)
                    export home
                    export bullet_service_status
                    export start_script
                    export start_service_status
                    export start_service
                    ./installers/Linux_Universal/bb-start-modes/run-in-background-auto-restart.sh
                    clear
                    ;;
                4)
                    export bullet_service_status
                    ./installers/Linux_Universal/bb-stop.sh
                    clear
                    ;;
                5)
                    export bullet_service_status
                    ./installers/Linux_Universal/bot-config-setup.sh
                    clear
                    ;;
                6)
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
