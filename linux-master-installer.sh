#!/bin/bash

# ############################################################################ #
#                                                                              #
# linux-master-installer.sh                                                    #
# -------------------------                                                    #
# This master installer looks at the operating system, architecture, bit type, #
# etc., to determine whether or not BulletBot and/or the installers are        #
# compatible...                                                                #
# Once the system is deemed compatible, the appropriate sub-master installer   #
# will be chosen and executed.                                                 #
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


# -------- #
# FUNCTION #
# -------- #
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
                supported=true
                ./installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            else
                supported=false
            fi
            ;;
        18.04)
            # B.1.
            if [[ $bits = 64 ]]; then
                supported=true
                ./installers/Debian-Ubuntu/debian-ubuntu-installer.sh
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
            supported=true
            ./installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            ;;
        10)
            supported=true
            ./installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            ;;
        *)
            supported=false
            ;;
    esac
elif [[ $distro = "rhel" || $distro = "cent" ]]; then
    case "$sver" in
        7)
            # C.1. MongoDB only works on 64 bit versions of RHEL and CentOS
            if [[ $bits = 64 ]]; then
                supported=true
	        ./installers/CentOS-RHEL/centos-rhel-installer.sh
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
