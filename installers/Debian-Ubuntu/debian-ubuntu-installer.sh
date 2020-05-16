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
        \nExecStart=/usr/bin/node ${home}/out/index.js  \
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
    # This function deals with downloading BulletBot (the latest release from
    # github) and replacing/updating the existing code for BulletBot (if there
    # is any)
    download_bb() {
        clear
        printf "We will now download the compiled version of the newest release. "
        read -p "Press [Enter] to begin."
        
        old_bulletbot=$(date)

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Error trapping
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
        trap "echo -e \"\n\nScript forcefully stopped\" && clean_up; echo \
            \"Exiting...\" && exit" SIGINT SIGTERM SIGTSTP

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Functions of the function
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #   
        # Copies 'bot-config.json' to a temporary file
        saving_config() {
            if [[ ! -d tmp ]]; then
                mkdir tmp || {
                    echo "Failed to create 'tmp/'" >&2
                    echo "${cyan}Please create it manually before continuing${nc}"
                    echo -e "\nExiting..."
                    exit 1
                }
            fi
            cp "$1"/bot-config.json tmp/ || {
                echo "${red}Failed to copy 'bot-config.json' to 'tmp/'" >&2
                echo "${cyan}Please copy it manually before continuing"
                echo "File location: '$1/'${nc}"
                echo -e "\nExiting..."
                exit 1
            }
            if [[ -f /home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.local ]];
                cp /home/bulletbot/installers/Linux_Universal/auto-restart/bullet-mongo-start.local tmp/ || {
                    echo "${red}Failed to copy 'bullet-mongo-start.local' to" \
                        "'tmp/'" >&2
                    echo "${cyan}Please copy it manually before continuing"
                    echo "File location: '/home/bulletbot/installers/Linux_Universal/auto-restart/'${nc}"
                    echo -e "\nExiting..."
                    exit 1
                }
            fi
        }

        # Cleans up any loose ends/left over files if the script exits
        clean_up() {
            echo "Cleaning up files and directories..."
            if [[ -d tmp ]]; then rm -r tmp/; fi
            if [[ -f BulletBot.zip ]]; then rm -r BulletBot.zip; fi

            if [[ ! -d out || ! -f package-lock.json || ! -f package.json ]]; then
                echo "Restoring from 'Old_BulletBot/${old_bulletbot}'"
                cp -r Old_BulletBot/"$old_bulletbot"/* . || {
                    echo "${red}Failed to restore from 'Old_BulletBot'${nc}" >&2
                }
            fi

            echo "Changing ownership of the file(s) in '/home/bulletbot'..."
            chown bulletbot:bulletbot -R "$home"
        }

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Prepping
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
        if [[ $bullet_service_status = "active" ]]; then
            # B.1. $exists = true when 'bulletbot.service' is active, and is
            # used to indicate to the user that the service was stopped and that
            # they will need to start it
            exists="true"
            echo "Stopping 'bulletbot.service'..."
            systemctl stop bulletbot.service || {
                echo "${red}Failed to stop 'bulletbot.service'" >&2
                echo "${cyan}Manually stop 'bulletbot.service' before" \
                    "continuing${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi
    
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Checking for required software/applications
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
        # Installs curl if it isn't already
        if ! hash curl &>/dev/null; then
            echo "${yellow}curl is not installed${nc}"
            echo "Installing curl..."
            apt -y install curl || {
                echo "${red}Failed to install curl" >&2
                echo "${cyan}curl must be installed in order to continue${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi
 
        # Installs wget if it isn't already
        if ! hash wget &>/dev/null; then
            echo "${yellow}wget is not installed${nc}"
            echo "Installing wget..."
            apt -y install wget || {
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
            apt -y install unzip || {
                echo "${red}Failed to install unzip" >&2
                echo "${cyan}unzip must be installed in order to continue${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Saving 'bot-config.json' and downloading/updating BulletBot and its
    # services
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
        # Grabs the tag from the most recent release
        tag=$(curl -s https://api.github.com/repos/CodeBullet-Community/BulletBot/releases/latest \
            | grep -oP '"tag_name": "\K(.*)(?=")')
        local latest_release="https://github.com/CodeBullet-Community/BulletBot/releases/download/${tag}/BulletBot.zip"

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

        echo "Creating 'Old_BulletBot/${old_bulletbot}'..."
        mkdir Old_BulletBot/"$old_bulletbot"

        echo "Moving files/directories associated with BulletBot to 'Old_BulletBot/${old_bulletbot}'..."
        for dir in "${files[@]}"; do
            if [[ -d $dir || -f $dir ]]; then
                mv -f "$dir" Old_BulletBot/"$old_bulletbot"
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
            echo "${red}Failed to unzip 'BulletBot.zip'" >&2
            clean_up
            echo -e "\nExiting..."
            exit 1
        }
        echo "Removing 'BulletBot.zip'..."
        rm BulletBot.zip 2>/dev/null || echo "${red}Failed to remove" \
            "'BulletBot.zip'${nc}" >&2

        if [[ -d tmp ]]; then
            if [[ -f tmp/bot-config.json ]]; then
                mv tmp/bot-config.json out/ || {
                    echo "${red}Failed to move 'bot-config.json' to 'out/'" >&2
                    echo "${yellow}Before starting BulletBot, you will have to" \
                        "manually move 'bot-config.json' from 'tmp/' to 'out/'${nc}"
                    move_failed="true"
                }
            fi

            if [[ -f tmp/bullet-mongo-start.local ]]; then
                mv tmp/bullet-mongo-start.local /home/bulletbot/installers/Linux_Universal/auto-restart/ || {
                    echo "${red}Failed to move 'bullet-mongo-start.local'" >&2
                    echo "${yellow}Before starting BulletBot, you will have to" \
                        "manually move 'bullet-mongo-start.local' from 'tmp/' to" \
                        "'/home/bulletbot/installers/Linux_Universal/auto-restart'${nc}"
                    move_failed="true"
                }
            fi
    
            # If an error didn't occur while moving the files above...
            if [[ ! $move_failed ]]; then
                rm -r tmp/ || echo "${red}Failed to remove 'tmp/'${nc}" >&2
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
        ./installers/Linux_Universal/auto-restart/auto-restart-updater.sh || {
            echo "${red}Failed to $create_or_update_2 'bullet-mongo-start.service'" \
                "${nc}" >&2
            local b_m_s_s_update="Failed"
        }

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Cleaning up and presenting results...
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
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
            echo "${nc}"
        fi

        # B.1.
        if [[ $bb_active ]]; then
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

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # Makes sure that the system user 'bulletbot' and the home directory
    # '/home/bulletbot' already exists, and that your working directory is
    # '/home/bulletbot'.
    # 
    # TL;DR: Makes sure that all necessary (important) services, files,
    # directories, and users exist and are in their proper locations.
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
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

            echo "Moving files/directories associated with BulletBot to" \
                "'$home'..."
            for dir in "${files[@]}"; do
                # C.1. If two separate directories with the same name exist in
                # $home and the current dir...
                if [[ -d "${home}/${dir}" && -d $dir ]]; then
                    # D.1. Removes the directory in $home because an error would
                    # occur otherwise when moving $dir to $home
                    rm -rf "${home:?}/${dir:?}"
                fi
                # C.1. and D.1. are done because a directory can't overwrite
                # another directory that contains files
                mv -f "$dir" "$home" 2>/dev/null
            done
            
            echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
            chown bulletbot:bulletbot -R "$home"
            cd "$home" || {
                echo "${red}Failed to change working directory to" \
                    "'/home/bulletbot'" >&2
                echo "${cyan}Change your working directory to '/home/bulletbot'" \
                    "${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        # Creates bulletbot's home directory if it does not exist
        elif [[ ! -d $home ]]; then
            echo "${yellow}bulletbot's home directory does not exist${nc}" >&2
            echo "Creating '$home'..."
            mkdir "$home"

            echo "Moving files/directories associated with BulletBot to" \
                "'$home'..."
            for dir in "${files[@]}"; do
                # C.1.
                if [[ -d "${home}/${dir}" && -d $dir ]]; then
                    # D.1.
                    rm -rf "${home:?}/${dir:?}"
                fi
                mv -f "$dir" "$home" 2>/dev/null
            done

            echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
            chown bulletbot:bulletbot -R "$home"
            cd "$home" || {
                echo "${red}Failed to change working directory to" \
                    "'/home/bulletbot'" >&2
                echo "${cyan}Change your working directory to '/home/bulletbot'" \
                    "${nc}"
                echo -e "\nExiting..."
                exit 1
            }
        fi

        if [[ $PWD != "/home/bulletbot" ]]; then
            echo "Moving files/directories associated with BulletBot to" \
                "'$home'..."
            for dir in "${files[@]}"; do
                # C.1.
                if [[ -d "${home}/${dir}" && -d $dir ]]; then
                    # D.1.
                    rm -rf "${home:?}/${dir:?}"
                fi
                mv -f "$dir" "$home" 2>/dev/null
            done

            echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
            chown bulletbot:bulletbot -R "$home"
            cd "$home" || {
                echo "${red}Failed to change working directory to" \
                    "'/home/bulletbot'" >&2
                echo "${cyan}Change your working directory to '/home/bulletbot'" \
                    "${nc}"
                echo -e "\nExiting..."
                exit 1
            }
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

    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
    # User options for installing perquisites, downloading BulletBot, and
    # starting BulletBot in different run modes
    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #
        # Checks to see if it is necessary to download BulletBot (the most
        # recent compiled release)
        if [[ -d src || ! -d out ]]; then
            if [[ -d src && ! -d out ]]; then
                echo "${cyan}The uncompiled version of BulletBot's code is" \
                    "currently on your system and this installer does not" \
                    "compile typescript into javascript. In order to continue," \
                    "please download the most recent compiled release using" \
                    "option 1.${nc}"
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
                    echo "${red}Invalid input: '$option' is not a valid" \
                        "option${nc}" >&2
                    continue
                    ;;
            esac
        # If any of the prerequisites are not installed or set up, the user will
        # be required to install them using the options below
        elif (! hash mongod || ! hash node || ! hash npm || [[ ! -f \
                out/bot-config.json || ! -d node_modules ]]) &>/dev/null; then
            echo "${cyan}Some or all prerequisites are not installed. Due to" \
                "this, all options to run BulletBot have been hidden until all" \
                "the prerequisites are installed and setup.${nc}"
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
                    ./installers/Linux_Universal/setup/bot-config-setup.sh
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
            if [[ $start_service_status = 0 && -f $bullet_service && $bullet_service_status \
                    = "active" ]]; then
                # E.1.
                if [[ ! -f $start_script ]]; then
                    echo "${yellow}WARNING: 'bullet-mongo-start.sh' does not" \
                        "exist and will prevent BulletBot from auto-restarting" \
                        "on system reboot/start"
                    echo "${cyan}Either re-download BulletBot via the installer" \
                        "or run BulletBot only in the background${nc}"
                fi

                echo "1. Download/update BulletBot and auto-restart files/services"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart${green}" \
                    "(Running in this mode)${nc}"
            elif [[ $start_service_status = 0 && -f $bullet_service && $bullet_service_status \
                    != "active" ]]; then
                # E.1.
                if [[ ! -f $start_script ]]; then
                    echo "${yellow}WARNING: 'bullet-mongo-start.sh' does not" \
                        "exist and will prevent BulletBot from auto-restarting" \
                        "on system reboot/start"
                    echo "${cyan}Either re-download BulletBot via the installer" \
                        "or run BulletBot only in the background${nc}"
                fi

                echo "1. Download/update BulletBot and auto-restart files/services"
                echo "2. Run BulletBot in the background"
                echo "3. Run BulletBot in the background with auto-restart${yellow}" \
                    "(Setup to use this mode)${nc}"
            elif [[ -f $bullet_service && $bullet_service_status = "active" ]]; then
                echo "1. Download/update BulletBot and auto-restart files/services"
                echo "2. Run BulletBot in the background ${green}(Running in" \
                    "this mode)${nc}"
                echo "3. Run BulletBot in the background with auto-restart"
            elif [[ -f $bullet_service && $bullet_service_status != "active" ]]; then
                echo "1. Download/update BulletBot and auto-restart files/services"
                echo "2. Run BulletBot in the background ${yellow}(Setup to" \
                    "use this mode)${nc}"
                echo "3. Run BulletBot in the background with auto-restart"
            # If this occurs, that means that 'bulletbot.service' has not been created
            # for some reason
            else
                echo "1. Download/update BulletBot and auto-restart files/services"
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
                    ./installers/Linux_Universal/setup/bot-config-setup.sh
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
