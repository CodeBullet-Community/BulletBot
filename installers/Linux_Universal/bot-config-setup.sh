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
            # EPEL is required to install jq 
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
            echo "${cyan}jq is required to create human-readable json files${nc}"
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
    echo -e "\n-------------"
    echo "${cyan}This field is required and cannot be left blank${nc}"
    while true; do
        read -p "Enter bot token: " bot_token
        if [[ -n $bot_token ]]; then 
            break
        fi
    done
    echo "Bot token: $bot_token"
    echo -e "-------------\n"

    echo "-------------"
    echo "${cyan}If this field is left blank, the default MongoDB URL will be" \
        "used: mongodb://localhost:27017${nc}"
    read -p "Enter the MongoDB URL (i.e. mongodb://localhost:[port]): " mongodb_url
    if [[ -z $mongodb_url ]]; then mongodb_url="mongodb://localhost:27017"; fi
    echo "MongoDB URL: $mongodb_url"
    echo -e "-------------\n"

    echo "-------------"
    echo "${cyan}Depending on how MongoDB was set up (i.e. Authorization is" \
        "not used), this field can be left empty${nc}"
    read -p "Enter the MongoDB URL suffix (i.e. ?authSource=admin): " mongodb_url_suffix
    echo "MongoDB URL suffix: $mongodb_url_suffix"
    if [[ -z $mongodb_url_suffix ]]; then mongodb_url_suffix=""; fi
    echo -e "-------------\n"

    echo "-------------"
    read -p "Enter the Google API Key: " google_api_key
    echo "Google API Key: $google_api_key"
    if [[ -z $google_api_key ]]; then
        google_api_key=""
        echo "${yellow}You will not be able to use commands that require" \
            "access to Google products${nc}"
    fi
    echo -e "-------------\n"
#
################################################################################
#
# Creates or overwrites the BulletBot config file
#
################################################################################
#   
    json="{
        \"botToken\": \"$bot_token\",
        \"cluster\": {
            \"url\": \"$mongodb_url\",
            \"suffix\": \"$mongodb_url_suffix\"
        },
        \"googleAPIKey\": \"$google_api_key\",
        \"globalUpdateInterval\": 10000,
        \"cleanInterval\": 600000,
        \"pActionsInterval\": 1000,
        \"YTResubInterval\": 259200000,
        \"crashProof\": {
            \"file\": \"/home/bulletbot/crashProof.time\",
            \"interval\": 10000
        },
        \"callback\": {
            \"URL\": \"$public_ip\",
            \"port\": 8000,
            \"path\": \"/webhooks\"
        },
        \"youtube\": {
            \"logo\": \"https://www.android-user.de/wp-content/uploads/2018/07/icon-youtobe.png\",
            \"color\": 16711680,
            \"name\": \"YouTube\"
        }
    }"

    if [[ ! -f src/botconfig.json ]]; then
        echo "Creating 'botconfig.json'..."
    else
        echo "Overwriting 'botconfig.json'..."
    fi
    
    # A.1 Piping json to jq formats the output into human-readable json format
    echo "$json" | jq . > src/bot-config.json || {
        echo "${red}Failed to create 'bot-config.json' in a human-readable" \
            "format${nc}" >&2
        echo "Creating 'bot-config.json' in a non-human-readable format..."
        echo "$json" > src/bot-config.json
    }
    
    if [[ -d out/ ]]; then
        echo "Re-compiling code..."
        tsc || {
            echo "${red}Failed to compile code${nc}" >&2
        }
        echo -e "\n${cyan}If there are any errors, resolve whatever issue is" \
            "causing them, then attempt to compile the code again\n${nc}"
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
    if [[ $bulletbot_service_status = "active" ]]; then
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

        echo -e "${cyan}Please check the logs above to make sure that there" \
            "aren't any errors, and if there are, to resolve whatever issue" \
            "is causing them\n${nc}"
    fi

    read -p "Press [Enter] to return to the installer menu"
