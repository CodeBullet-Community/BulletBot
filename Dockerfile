# Portable installation that doesn't install anything on your machine.

# Note: The database is not persistent by default. To enable persistence, mount a volume or a directory to /data/db on the container.
# How to use:
#   - Install docker
#   - Run "docker build . -t bulletbot" in the same directory as the Dockerfile
#   - Run "docker run --rm -it bulletbot" to start the bot

# Centos base image
FROM centos:8

# Add your bot token and discord user ID below
ENV BOT_TOKEN ""
ENV DISCORD_UID ""

# Optional/Defaults
ENV MONGO_PORT "27017"
ENV MONGO_URL_SUFFIX ""
ENV GOOGLE_API_KEY ""
ENV MONGODB_OPTIONS ""

# Getting source code
RUN yum -y install git && git clone https://github.com/CodeBullet-Community/BulletBot /home/bulletbot
WORKDIR /home/bulletbot

# Navigating the installer. OPTION 5: BOT TOKEN -> MONGO URL -> MONGO URL SUFFIX -> GOOGLE API KEY
# Ignore systemd errors
RUN { echo 1; echo; echo; \
echo 2; echo; echo; \
echo 3; echo; echo; \
echo 5; echo; \
echo ${BOT_TOKEN}; echo mongodb://localhost:${MONGO_PORT}; echo; ${MONGO_URL_SUFFIX} echo; echo; \
echo 6; echo; echo; \
echo 5; \
} | ./linux-master-installer.sh && \
mkdir -p /var/run/mongodb && chown mongod:mongod /var/run/mongodb && chmod 0775 /var/run/mongodb && \
mkdir -p /data/db && chown mongod:mongod /data/db && chmod 0775 /data/db

# Running mongodb, inserting a config file, and then running the bot
# For enabling authentication, follow the guide on "https://bulletbot.readthedocs.io/en/latest/Setup-Guides/Production/Linux-Prod-Setup-Guide/" and insert the required json like done below
ENTRYPOINT []
CMD nohup mongod ${MONGODB_OPTIONS} & \
while ! (ss -tln | awk '{print $4}' | grep ":${MONGO_PORT}"); do sleep 0.5; done && \
echo -e "use settings\ndb.settings.insert({\"prefix\":\"?!\",\"presence\":{\"status\":\"online\",\"game\":{\"name\":\"?!help\",\"type\":\"Playing\"}},\"embedColors\":{\"default\":8311585,\"help\":8311585,\"neutral\":4868682,\"negative\":15805477,\"warn\":16086051,\"positive\":8311585},\"botMasters\":[\"[${Discord_UID}]\"],\"commands\":{\"animal\":{\"apis\":{\"cat\":\"https://some-random-api.ml/img/cat\",\"dog\":\"https://some-random-api.ml/img/dog\",\"fox\":\"https://some-random-api.ml/img/fox\",\"panda\":\"https://some-random-api.ml/img/panda\",\"red-panda\":\"https://some-random-api.ml/img/red_panda\",\"bird\":\"https://some-random-api.ml/img/birb\",\"pikachu\":\"https://some-random-api.ml/pikachuimg\"}},\"purge\":{\"maxMessages\":1000}}})" | mongo --port 27017 && \
node /home/bulletbot/out/index.js
