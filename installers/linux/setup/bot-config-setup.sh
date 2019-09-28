#!/bin/bash

clear
echo "We will now set up bot-config.json"
read -p "NOTE: This setup will only have you input the configurations that are \
required for BulletBot to work. Any other settings/configurations must be added \
manually (i.e. Google API Key)."

echo -e "\n-------------"
while true; do
    read -p "Enter bot token: " bot_token
    if [[ ! -z $bot_token ]]; then 
        break
    else
        echo "${red}Bot token can not be empty${nc}"
        continue
    fi
done
echo "Bot token: $bot_token"
echo -e "-------------\n"

echo "-------------"
while true; do
    read -p "Enter the MongoDB url (i.e. mongodb://localhost:[port]): " mongodb_url
    if [[ ! -z $bot_token ]]; then 
        break
    else
        echo "${red}MongoDB url can not be empty${nc}"
        continue
    fi
done
echo "MongoDB url: $mongodb_url"
echo -e "-------------\n"

echo "-------------"
echo "${cyan}NOTE: Depending on how MongoDB was set up (i.e. Authorization is" \
    "used), this field CAN be left empty${nc}"
read -p "Enter the suffix to the MongoDB url (i.e. ?authSource=admin): " mongodb_url_suffix
if [[ -z $mongodb_url_suffix ]]; then mongodb_url_suffix=""; fi
echo "MongoDB url suffix: $mongodb_url_suffix"
echo -e "-------------\n"

bot_version=$(jq .version package.json)
json="{
    \"version\": \"$bot_version\",
    \"botToken\": \"$bot_token\",
    \"cluster\": {
        \"url\": \"$mongodb_url\",
        \"suffix\": \"$mongodb_url_suffix\"
    },
    \"googleAPIKey\": \"[optional Google API key]\",
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
        \"url\": \"[url to google from]\",
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
        \"file\": \"home/bulletbot/crashProof.time\",
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
    echo $json | jq . > out/bot-config.json || {
        echo "${red}Failed to create 'bot-config.json' with human-readable JSON" \
            "format${nc}" >&2
        echo "Creating 'bot-config.json' wihtout human-readable JSON format..."
        echo $json > out/bot-config.json
    }
else
    while true; do
        echo "${cyan}'bot-config.json' already exists${nc}"
        echo "Would you like to:"
        echo "1. Overwrite existing 'bot-config.json'"
        echo "2. Compare the two side by side"
        echo "3. Stop and return to master installer menu"
        read option
        case $option in
            1)
                echo "Overwriting 'bot-config.json'..."
                echo $json | jq . > out/bot-config.json || {
                    echo "${red}Failed to overwrite 'bot-config.json' with" \
                        "human-readable JSON format${nc}" >&2
                    echo "Overwriting 'bot-config.json' without human-readable" \
                        "JSON format..."
                    echo $json > out/bot-config.json
                }
                break
                ;;
            2)
                echo $json | jq . > tmp.json || {
                    echo "${red}Failed to create 'tmp.json' with human-readable" \
                        "JSON format${nc}" >&2
                    echo "Creating 'tmp.json' without human-readable JSON format..."
                    echo $json > tmp.json
                }
                diff -s -y tmp.json out/bot-config.json
                read
                rm tmp.json
                clear
                ;;
            3)
                echo -e "\nReturning to master installer menu..."
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

echo "Changing ownership of files added to the home directory..."
chown bulletbot:admin -R *
echo -e "\n${green}Finished setting up 'bot-config.json'${nc}"
read -p "Press [Enter] to continue to master installer menu"
