#!/bin/bash

clear
read -p "We will now set up 'bot-config.json'. Press [Enter] to begin."

echo -e "\n-------------"
echo "${cyan}This is a required field and cannot be left blank${nc}"
while true; do
    read -p "Enter bot token: " bot_token
    if [[ ! -z $bot_token ]]; then 
        break
    fi
done
echo "Bot token: $bot_token"
echo -e "-------------\n"

echo "-------------"
echo "${cyan}If this field is left blank, the default MongoDB url will be used:" \
    "mongodb://localhost:27017${nc}"
read -p "Enter the MongoDB url (i.e. mongodb://localhost:[port]): " mongodb_url
if [[ -z $mongodb_url ]]; then mongodb_url="mongodb://localhost:27017"; fi
echo "MongoDB url: $mongodb_url"
echo -e "-------------\n"

echo "-------------"
echo "${cyan}Depending on how MongoDB was set up (i.e. Authorization is not" \
    "used), this field can be left empty${nc}"
read -p "Enter the MongoDB url suffix (i.e. ?authSource=admin): " mongodb_url_suffix
echo "MongoDB url suffix: $mongodb_url_suffix"
if [[ -z $mongodb_url_suffix ]]; then mongodb_url_suffix=""; fi
echo -e "-------------\n"

echo "-------------"
read -p "Enter the Google API Key: " google_api_key
echo "Google API Key: $google_api_key"
if [[ -z $google_api_key ]]; then
    google_api_key=""
    echo "${yellow}You will not be able to use commands that require access to" \
        "Google products${nc}"
fi
echo -e "-------------\n"

json="{
    \"botToken\": \"$bot_token\",
    \"cluster\": {
        \"url\": \"$mongodb_url\",
        \"suffix\": \"$mongodb_url_suffix\"
    },
    \"googleAPIKey\": \"$google_api_key\",
    \"bugForm\": {
        \"url\": \"[url to google form]\",
        \"serverID\": 123,
        \"serverName\": 123,
        \"userID\": 123,
        \"userName\": 123,
        \"messageID\": 123,
        \"channelID\": 123,
        \"bug\": 123
    },
    \"suggestionForm\": {
        \"url\": \"[url to google form]\",
        \"serverID\": 123,
        \"serverName\": 123,
        \"userID\": 123,
        \"userName\": 123,
        \"messageID\": 123,
        \"channelID\": 123,
        \"suggestion\": 123
    },
    \"globalUpdateInterval\": 10000,
    \"cleanInterval\": 600000,
    \"pActionsInterval\": 1000,
    \"YTResubInterval\": 259200000,
    \"crashProof\": {
        \"file\": \"/home/bulletbot/crashProof.time\",
        \"interval\": 10000
    },
    \"callback\": {
        \"URL\": \"[ip address or domain name]\",
        \"port\": 8000,
        \"path\": \"/webhooks\"
    },
    \"youtube\": {
        \"logo\": \"https://www.android-user.de/wp-content/uploads/2018/07/icon-youtobe.png\",
        \"color\": 16711680,
        \"name\": \"YouTube\"
    }
}"

if [ ! -f out/bot-config.json ]; then
    echo "Creating 'bot-config.json'..."
    # A.1 Piping 'json' to jq formats the output into human-readable JSON format
    echo $json | jq . > out/bot-config.json || {
        echo "${red}Failed to create 'bot-config.json' with a human-readable JSON" \
            "format${nc}" >&2
        echo "Creating 'bot-config.json' wihtout a human-readable JSON format..."
        echo $json > out/bot-config.json
    }
else
    while true; do
        echo "${cyan}'bot-config.json' already exists${nc}"
        echo "Would you like to:"
        echo "1. Create a new BulletBot config file ('bot-config.json')"
        echo "2. Compare the two config files side by side"
        echo "3. Stop and return to master installer menu"
        read option
        case $option in
            1)
                if [ -f out/bot-config.json.old ]; then
                    echo "Overwriting current 'bot-config.json.old' with current" \
                        "'bot-config.json'..."
                else
                    echo "Changing current 'bot-config.json' to 'bot-config.json.old...'"
                fi

                mv out/bot-config.json out/bot-config.json.old
                echo "Creating new 'bot-config.json'..."
                echo $json | jq . > out/bot-config.json || {
                    echo "${red}Failed to overwrite 'bot-config.json' with a" \
                        "human-readable JSON format${nc}" >&2
                    echo "Overwriting 'bot-config.json' without a human-readable" \
                        "JSON format..."
                    echo $json > out/bot-config.json
                }
                break
                ;;
            2)
                echo $json | jq . > tmp.json || {
                    echo "${red}Failed to create 'tmp.json' with a human-readable" \
                        "JSON format${nc}" >&2
                    echo "Creating 'tmp.json' without a human-readable JSON format..."
                    echo $json > tmp.json
                }
                diff -s -y tmp.json out/bot-config.json
                read
                rm tmp.json
                clear
                ;;
            3)
                echo -e "\nReturning to the master installer menu..."
                exit 0
                ;;
            *)
                clear
                echo "${red}Invalid input: '$option' is not a valid option${nc}" >&2
                continue
                ;;
        esac
    done
fi

echo "Changing ownership of the file(s) added to '/home/bulletbot'..."
chown bulletbot:bulletbot -R /home/bulletbot
echo -e "\n${green}Finished setting up 'bot-config.json'${nc}"

if [[ $bullet_status = "active" ]]; then
    timer=20
    echo "Restarting bulletbot.service to apply changes to 'bot-config.json'..."
    systemctl restart bulletbot.service || {
        echo "${red}Failed to restart bulletbot.service" >&2
        echo "${cyan}You will need to manually restart 'bulletbot.service' to" \
            "apply changes to 'bot-config.json'${nc}"
        read -p "Press [Enter] to return to the master installer"
        exit 1
    }

    # Waits in order to give bulletbot.service enough time to start
    echo "Waiting 20 seconds for bulletbot.service to start..."
    while (($timer > 0)); do
        echo -en "\r$timer seconds left"
        sleep 1
        ((timer-=1))
    done
    # Lists the last 40 logs in order to better identify if and when
    # an error occured during the start up of bulletbot.service
    echo -e "\n\n--------Last 40 lines of logged events for" \
        "bulletbot.service---------\n$(journalctl -u bulletbot -n \
        40)\n---------End of bulletbot.service logs--------\n"

    echo -e "Please check the logs above to make sure that there aren't any" \
        "errors, and if there are, to resolve whatever issue is causing them\n"
fi

read -p "Press [Enter] to return to master installer menu"
