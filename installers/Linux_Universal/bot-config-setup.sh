#!/bin/bash

################################################################################
#
# Using user input, creates the BulletBot config file ('bot-config.json').
#
# Note: All variables not defined in this script are exported from
# 'linux-master-installer.sh', and 'debian-ubuntu-installer.sh' or
# 'centos-rhel-installer.sh'.
#
################################################################################
#
    clear
    read -p "We will now set up 'bot-config.json'. Press [Enter] to begin."

    epel_installed="false"

#
################################################################################
#
# [ Functions ]
#
################################################################################
#
    epel_and_pkg() {
        # CentOS and RHEL use the yum/dnf package manager while Debian and
        # Ubuntu use apt
        if [[ $distro = "centos" || $distro = "rhel" ]]; then
            # EPEL must be installed in order to install jq and during
            if [[ $sver = "7" ]]; then
                if [[ $epel_installed = "false" ]]; then
                    yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm && epel_installed="true" || {
                        echo "${red}Failed to install Extra Packages for" \
                            "Enterprise Linux${nc}" >&2
                    }
                fi
                pkg_manager="yum"
            else
                if [[ $epel_installed = "false" ]]; then
                    dnf -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm && epel_installed="true" || {
                        echo "${red}Failed to install Extra Packages for" \
                            "Enterprise Linux${nc}" >&2
                    }
                fi
                pkg_manager="dnf"
            fi
        else
            pkg_manager="apt"
        fi
    }

#
################################################################################
#
# Checking for required software/applications
#
################################################################################
#
    if ! hash jq &>/dev/null; then
        echo "${yellow}jq is not installed${nc}"
        epel_and_pkg
        echo "Installing jq..."
        "$pkg_manager" -y install jq || {
            echo "${red}Failed to install jq" >&2
            echo "${cyan}jq is required to create nicely formated json files${nc}"
        }
    fi

    if ! hash dig &>/dev/null; then
        echo "${yellow}dig is not installed${nc}"
        epel_and_pkg
        echo "Installing dig..."
        # On CentOS/RHEL, dig is installed from the bind-utils package
        "$pkg_manager" -y install dnsutils || "$pkg_manager" -y install bind-utils || {
            echo "${red}Failed to install dig" >&2
            echo "${cyan}dig should be installed so that your system's public" \
                "IP Address can be retrieved in the most secure way"
            echo "The installer will use its secondary method to retrieve your" \
                "system's public IP Address${nc}"
        }
    fi

#
################################################################################
#
# Checks the system's/router's public IP Address
#
# Note: If you have a dynamic public IP Address, it will not be possible to use
# webhooks
#
################################################################################
#
    # This method of retrieving the system's public IP Address only works on
    # systems placed behind a router. It will not work on servers hosted by
    # services such as AWS
    public_ip=$(dig +short myip.opendns.com @resolver1.opendns.com)

    if [[ ! $public_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        # This method is less secure than the method above, but works on both
        # cloud servers and systems placed behind a router
        public_ip=$(curl -s https://ifconfig.me/ip)
        if [[ ! $public_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "${red}Failed to grab Public IP Address" >&2
            echo "${cyan}If you plan on using webhooks, you will need to" \
                "manually add your system's Public IP Address to the config" \
                "file"
        fi
    fi

#
################################################################################
#
# User input that is saved to the BulletBot config file
#
################################################################################
#
    # TODO: TO BE DETERMINED

#
################################################################################
#
# Creates the BulletBot config file or provides the user with a few options,
# if the config file already exists
#
################################################################################
#   
    # TODO: TO BE DETERMINED
    json="TO BE DETERMINED"

    if [[ ! -f out/bot-config.json ]]; then
        echo "Creating 'bot-config.json'..."
        # A.1 Piping json to jq formats the output into human-readable json format
        echo "$json" | jq . > out/bot-config.json || {
            echo "${red}Failed to create 'bot-config.json' in a human-readable" \
                "format${nc}" >&2
            echo "Creating 'bot-config.json' in a non-human-readable format..."
            echo "$json" > out/bot-config.json
        }
    else
        while true; do
            echo "${cyan}'bot-config.json' already exists${nc}"
            echo "Would you like to:"
            echo "1. Create a new BulletBot config file ('bot-config.json')"
            echo "2. Compare the two config files side by side"
            echo "3. Stop and return to the installer menu"
            read option
            case "$option" in
                1)
                    if [[ -f out/bot-config.json.old ]]; then
                        echo "Overwriting current 'bot-config.json.old' with" \
                            "current 'bot-config.json'..."
                    else
                        echo "Changing current 'bot-config.json' to" \
                            "'bot-config.json.old'..."
                    fi

                    mv out/bot-config.json out/bot-config.json.old
                    echo "Creating new 'bot-config.json'..."
                    # A.1.
                    echo "$json" | jq . > out/bot-config.json || {
                        echo "${red}Failed to overwrite 'bot-config.json' in" \
                            "a human-readable format${nc}" >&2
                        echo "Overwriting 'bot-config.json' in a" \
                            "non-human-readable format..."
                        echo "$json" > out/bot-config.json
                    }
                    break
                    ;;
                2)
                    # A.1.
                    echo "$json" | jq . > tmp.json || {
                        echo "${red}Failed to create 'tmp.json' in a" \
                            "human-readable format${nc}" >&2
                        echo "Creating 'tmp.json' in a non-human-readable" \
                            "format..."
                        echo "$json" > tmp.json
                    }
                    diff -s -y tmp.json out/bot-config.json
                    read -p "Press [Enter] to return to the BulletBot config menu" 
                    rm tmp.json
                    clear
                    ;;
                3)
                    echo -e "\nReturning to the installer menu..."
                    exit 0
                    ;;
                *)
                    clear
                    echo "${red}Invalid input: '$option' is not a valid" \
                        "option${nc}" >&2
                    continue
                    ;;
            esac
        done
    fi

    echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
    chown bulletbot:bulletbot -R /home/bulletbot
    echo -e "\n${green}Finished setting up 'bot-config.json'${nc}"

#
################################################################################
#
# Restarts 'bulletbot.service' to load the new 'bot-config.json' for BulletBot
#
################################################################################
#
    if [[ $bullet_service_status = "active" ]]; then
        timer=20
        # Saves the current time and date, which will be used with journalctl
        start_time=$(date +"%F %H:%M:%S")

        echo "Restarting 'bulletbot.service' to apply changes to 'bot-config.json'..."
        systemctl restart bulletbot.service || {
            echo "${red}Failed to restart 'bulletbot.service'" >&2
            echo "${cyan}You will need to manually restart 'bulletbot.service'" \
                "to apply the changes to 'bot-config.json'${nc}"
            read -p "Press [Enter] to return to the installer menu"
            exit 1
        }
        
        # Waits in order to give 'bulletbot.service' enough time to restart
        echo "Waiting 20 seconds for 'bulletbot.service' to start..."
        while ((timer > 0)); do
            echo -en "${clrln}${timer} seconds left"
            sleep 1
            ((timer-=1))
        done
        
        # Lists the startup logs in order to better identify if and when
        # an error occurred during the startup of 'bulletbot.service'
        # Note: $no_hostname is purposefully unquoted. Do not quote those
        # variables
        echo -e "\n\n-------- bulletbot.service startup logs ---------" \
            "\n$(journalctl -u bulletbot -b $no_hostname -S "$start_time")" \
            "\n--------- End of bulletbot.service startup logs --------\n"

        echo -e "Please check the logs above to make sure that there aren't" \
            "any errors, and if there are, to resolve whatever issue is" \
            "causing them\n"
    fi

    read -p "Press [Enter] to return to the installer menu"
