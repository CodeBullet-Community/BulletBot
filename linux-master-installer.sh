#!/bin/bash

# Checks to see if this script was executed with root privilege
if [[ $EUID -ne 0 ]]; then 
    echo "${red}Please run this script as root or with root privilege${nc}"
    echo -e "\nExiting..."
    exit 1
fi

cd "$(dirname $0)"

# ------------------------------------------------- #
# FUNCTION ONLY USED AT THE BEGINNING OF THE SCRIPT #
# ------------------------------------------------- #
# Identify the operating system, version number, architecture, and bit type
# (32 or 64)
detect_os_ver_arch_bits() {
    arch=$(uname -m | sed 's/x86_//;s/i[3-6]86/32/')
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        os=$ID
        # Version: x.x.x...
        ver=$VERSION_ID
        # Version: x
        sver=$(echo $ver | grep -oP "[0-9]+" | head -1 )
        codename=$VERSION_CODENAME
    else
        os=$(uname -s)
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


# ------------------------------------------------------------- #
# DETECTS WHETHER BULLETBOT AND INSTALLER CAN BE USED ON THE OS #
# ------------------------------------------------------------- #
declare os ver arch bits codename
detect_os_ver_arch_bits
export os ver arch bits codename

echo "SYSTEM INFO"
echo "Bit type: $bits"
echo "Architecture: $arch"
echo "Operating System: $os"
echo "Operating System Version: $ver"
echo ""

if [[ $os = "ubuntu" ]]; then
    case $ver in
        16.04)
            # B.1. MongoDB only works on 64 bit versions of Ubuntu
            if [[ $bits = 64 ]]; then
                supported=true
                installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            else
                supported=false
            fi
            ;;
        18.04)
            # B.1.
            if [[ $bits = 64 ]]; then
                supported=true
                installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            else
                supported=false
            fi
            ;;
        # As of MongoDB 4.2, support for Ubuntu 14.04 has been removed
        *)
            supported=false
            ;;
    esac
elif [[ $os = "debian" ]]; then
    case $sver in
        9)
            supported=true
            installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            ;;
        10)
            supported=true
            installers/Debian-Ubuntu/debian-ubuntu-installer.sh
            ;;
        *)
            supported=false
            ;;
    esac
elif [[ $os = "rhel" ]]; then
    case $sver in
        7)
            # C.1. MongoDB only works on 64 bit versions of RHEL
            if [[ $bits = 64 ]]; then
                supported=false # has not been tested yet
            else
                supported=false
            fi
            ;;
        8)
            # C.1.
            if [[ $bits = 64 ]]; then
                supported=false # has not been tested yet
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
