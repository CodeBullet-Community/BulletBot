#!/bin/bash

# ############################################################################ #
#                                                                              #
# linux-master-installer.sh                                                    #
# -------------------------                                                    #
# This master installer looks at the operating system, architecture, bit type, #
# etc., to determine whether or not BulletBot and/or the installers are        #
# compatible...                                                                #
# Once the system is deemed compatible, the appropriate sub-master installer   #
# will be chosen, downloaded (if it isn't already), then executed.             #
#                                                                              #
# ############################################################################ #


# -------------------------------------------------- #                                                                           #-------------------------- #
# VARIABLES USED GLOBALLY AND OUTSIDE OF THIS SCRIPT #
# -------------------------------------------------- #
yellow=$'\033[1;33m'
green=$'\033[0;32m'
cyan=$'\033[0;36m'
red=$'\033[1;31m'
nc=$'\033[0m'


# ------------- #
# PRE-MAIN CODE #
# ------------- #
# Checks to see if this script was executed with root privilege
if [[ $EUID -ne 0 ]]; then 
    echo "${red}Please run this script as root or with root privilege${nc}"
    echo -e "\nExiting..."
    exit 1
fi

# Changes the active directory to that of where the executed script is located
cd "$(dirname $0)"


# --------- #
# FUNCTIONS #
# --------- #
# Identify the operating system, version number, architecture, and bit type
# (32 or 64)
detect_distro_ver_arch_bits() {
    arch=$(uname -m | sed 's/x86_//;s/i[3-6]86/32/')
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        distro="$ID"
        # Version: x.x.x...
        ver="$VERSION_ID"
        # Version: x (short handed version)
        sver=$(echo "$ver" | grep -oP "[0-9]+" | head -1 )
        pname="$PRETTY_NAME"
        codename="$VERSION_CODENAME"
    else
        distro=$(uname -s)
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
        *)
            arch="?"
            ;;
    esac
}

execute_debian_ubuntu_installer() {
    supported=true
    ./installers/Debian-Ubuntu/debian-ubuntu-installer.sh || {
        # A.1. If the sub-master installer doesn't exists... (It will never
        # exist if it is your first time running the master installer on your system)
        if [[ ! -f installers/Debian-Ubuntu/debian-ubuntu-installer.sh ]]; then
            wget -N https://github.com/CodeBullet-Community/BulletBot/releases/latest/download/debian-ubuntu-installer.sh || {
                echo "${red}Failed to download debian-ubuntu-installer.sh${nc}"
                # D.1. If wget is not installed...
                if ! hash wget &>/dev/null; then
                    echo "${yellow}wget is not installed${nc}"
                    echo "Installing wget..."
                    apt -y install wget || {
                        echo "${red}Failed to install wget" >&2
                        echo "${cyan}wget must be installed in order to continue${nc}"
                        echo -e "\nExiting..."
                        exit 1
                    }
                else
                    echo "${cyan}Either resolve the issue causing the error" \
                        "or manually download debian-ubuntu-installer.sh from" \
                        "github${nc}"
                    echo -e "\nExiting..."
                    exit 1
                fi
            }
            chmod +x debian-ubuntu-installer.sh
            ./debian-ubuntu-installer.sh
            rm debian-ubuntu-installer.sh
        fi
    }
}

execute_centos_rhel_installer() {
    supported=true
    ./installers/CentOS-RHEL/centos-rhel-installer.sh || {
        # A.1.
        if [[ ! -f installers/CentOS-RHEL/centos-rhel-installer.sh ]]; then
            wget -N https://github.com/CodeBullet-Community/BulletBot/releases/latest/download/centos-rhel-installer.sh || {
                echo "${red}Failed to download centos-rhel-installer.sh${nc}"
                # D.1.
                if ! hash wget &>/dev/null; then
                    echo "${yellow}wget is not installed${nc}"
                    echo "Installing wget..."
                    apt -y install wget || {
                        echo "${red}Failed to install wget" >&2
                        echo "${cyan}wget must be installed in order to continue${nc}"
                        echo -e "\nExiting..."
                        exit 1
                    }
                else
                    echo "${cyan}Either resolve the issue causing the error" \
                        "or manually download centos-rhel-installer.sh from" \
                        "github${nc}"
                    echo -e "\nExiting..."
                    exit 1
                fi
            }
            chmod +x centos-rhel-installer.sh
            ./centos-rhel-installer.sh
            rm centos-rhel-installer.sh
        fi
    }
}


# --------- #
# MAIN CODE #
# --------- #
detect_distro_ver_arch_bits
export distro sver ver arch bits codename
export yellow green cyan red nc

echo "SYSTEM INFO"
echo "Bit Type: $bits"
echo "Architecture: $arch"
echo "Linux Distro: $pname"
echo "Linux Distro Version: $ver"
echo ""

if [[ $distro = "ubuntu" ]]; then
    case "$ver" in
        16.04)
            # B.1. MongoDB only works on 64 bit versions of Ubuntu
            if [[ $bits = 64 ]]; then
                execute_debian_ubuntu_installer
            else
                supported=false
            fi
            ;;
        18.04)
            # B.1.
            if [[ $bits = 64 ]]; then
                execute_debian_ubuntu_installer
            else
                supported=false
            fi
            ;;
        # As of MongoDB 4.2, support for Ubuntu 14.04 has been removed
        *)
            supported=false
            ;;
    esac
elif [[ $distro = "debian" ]]; then
    case "$sver" in
        9)
            execute_debian_ubuntu_installer
            ;;
        10)
            execute_debian_ubuntu_installer
            ;;
        *)
            supported=false
            ;;
    esac
elif [[ $distro = "rhel" || $distro = "centos" ]]; then
    case "$sver" in
        7)
            # C.1. MongoDB only works on 64 bit versions of RHEL and CentOS
            if [[ $bits = 64 ]]; then
                execute_centos_rhel_installer
            else
                supported=false
            fi
            ;;
        8)
            # C.1.
            if [[ $bits = 64 ]]; then
                execute_centos_rhel_installer
            else
                supported=false
            fi
            ;;
        *)
            supported=false
            ;;
    esac
else
    supported=false
fi
    
if [[ $supported = false ]]; then
    echo "${red}Your operating system does not support the installation," \
        "setup, and/or use of BulletBot${nc}"
    echo -e "\nExiting..."
    exit 1
fi
