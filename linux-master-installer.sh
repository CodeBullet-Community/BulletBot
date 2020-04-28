#!/bin/bash

################################################################################
#
# This master installer looks at the operating system, architecture, bit type,
# etc., to determine whether or not the system is supported by BulletBot.
# Once the system is deemed as supported, the appropriate sub-master installer
# will be chosen, downloaded (if it isn't already), then executed.
#
# Installer version: v1.2.0 # The version number of the installers as a whole
# Note: The installer version number should not be considered when looking at
# compatability. The version number is more of a note for myself (Bark Ranger/
# StrangeRanger/Hunter T.).
#
################################################################################
#
# [ Variables ] used globally and outside of this script
#
################################################################################
#
    yellow=$'\033[1;33m'
    green=$'\033[0;32m'
    cyan=$'\033[0;36m'
    red=$'\033[1;31m'
    nc=$'\033[0m'
    clrln=$'\r\033[K'

#
################################################################################
#
# [ Variables ] exported and used only outside of the master installer
#
################################################################################
#
    # The '--no-hostname' flag for journalctl only works with systemd 230 and
    # above
    if (($(journalctl --version | grep -oP "[0-9]+" | head -1) >= 230)); then
        no_hostname="--no-hostname"
        export no_hostname
    fi

    # Used in combination with the sub-master installers to apply changes to
    # the installers after downloading the latest BulletBot release, without
    # requiring the user to exit then re-execute the master installer
    master_installer="/home/bulletbot/linux-master-installer.sh"
    export master_installer

#
################################################################################
#
# Error [ traps ]
#
################################################################################
#
    trap "echo -e \"\n\nScript forcefully stopped\nExiting...\" && exit" SIGINT \
        SIGTSTP SIGTERM
    
#
################################################################################
#
# Checks for root privilege and working directory
#
################################################################################
#
    # Checks to see if this script was executed with root privilege
    if ((EUID != 0)); then 
        echo "${red}Please run this script as root or with root privilege${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    fi

    # Changes the working directory to that of where the executed script is
    # located
    cd "$(dirname "$0")" || {
        echo "${red}Failed to change working directories" >&2
        echo "${cyan}Change your working directory to the same directory of" \
            "the executed script${nc}"
        echo -e "\nExiting..."
        exit 1
    }

#
################################################################################
#
# [ Functions ]
#
################################################################################
#
    # Identify the operating system, version number, architecture, bit type (32
    # or 64), etc.
    detect_distro_ver_arch_bits() {
        arch=$(uname -m | sed 's/x86_//;s/i[3-6]86/32/')
        
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            distro="$ID"
            # Version: x.x.x...
            ver="$VERSION_ID"
            # Version: x (short handed version)
            sver=${ver//.*/}
            pname="$PRETTY_NAME"
            codename="$VERSION_CODENAME"
        else
            distro=$(uname -s)
            ver=$(uname -r)
        fi

        # Identifying bit type
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

        # Identifying architecture type
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
            # A.1. Downloads the corresponding sub-master installer if it
            # doesn't exist
            if [[ ! -f installers/Debian-Ubuntu/debian-ubuntu-installer.sh ]]; then
                echo "Downloading 'debian-ubuntu-installer.sh'..."
                while true; do
                    wget -N https://github.com/CodeBullet-Community/BulletBot/releases/latest/download/debian-ubuntu-installer.sh || {
                        echo "${red}Failed to download 'debian-ubuntu-installer.sh'" \
                            "${nc}" >&2
                        if ! hash wget &>/dev/null; then
                            echo "${yellow}wget is not installed${nc}"
                            echo "Installing wget..."
                            apt -y install wget || {
                                echo "${red}Failed to install wget" >&2
                                echo "${cyan}wget must be installed in order" \
                                    "to continue${nc}"
                                echo -e "\nExiting..."
                                exit 1
                            }
                            echo "Attempting to download 'debian-ubuntu-installer.sh'" \
                                "again..."
                            continue
                        else
                            echo "${cyan}Either resolve the issue causing the" \
                                "error or manually download" \
                                "'debian-ubuntu-installer.sh' from github${nc}"
                            echo -e "\nExiting..."
                            exit 1
                        fi
                    }
                    break
                done
                chmod +x debian-ubuntu-installer.sh && ./debian-ubuntu-installer.sh || {
                    echo "${red}Failed to execute 'debian-ubuntu-installer.sh'${nc}" >&2
                    echo -e "\nExiting..."
                    exit 1
                }
                rm debian-ubuntu-installer.sh
            else
                echo "${red}Failed to execute 'debian-ubuntu-installer.sh'${nc}" >&2
                echo -e "\nExiting..."
                exit 1
            fi
        }
    }

    execute_centos_rhel_installer() {
        supported=true
        ./installers/CentOS-RHEL/centos-rhel-installer.sh || {
            # A.1.
            if [[ ! -f installers/CentOS-RHEL/centos-rhel-installer.sh ]]; then
                echo "Downloading 'centos-rhel-installer.sh'..."
                while true; do
                    wget -N https://github.com/CodeBullet-Community/BulletBot/releases/latest/download/centos-rhel-installer.sh || {
                        echo "${red}Failed to download 'centos-rhel-installer.sh'" \
                            "${nc}" >&2
                        if ! hash wget &>/dev/null; then
                            echo "${yellow}wget is not installed${nc}"
                            echo "Installing wget..."
                            dnf -y install wget || yum -y install wget || {
                                echo "${red}Failed to install wget" >&2
                                echo "${cyan}wget must be installed in order" \
                                    "to continue${nc}"
                                echo -e "\nExiting..."
                                exit 1
                            }
                            echo "Attempting to download 'centos-rhel-installer'" \
                                "again..."
                            continue
                        else
                            echo "${cyan}Either resolve the issue causing the" \
                                "error or manually download" \
                                "'centos-rhel-installer.sh' from github${nc}"
                            echo -e "\nExiting..."
                            exit 1
                        fi
                    }
                    break
                done 
                chmod +x centos-rhel-installer.sh && ./centos-rhel-installer.sh || {
                    echo "${red}Failed to execute 'centos-rhel-installer.sh'${nc}" >&2
                    echo -e "\nExiting..."
                    exit 1
                }
                rm centos-rhel-installer.sh
            else
                echo "${red}Failed to execute 'centos-rhel-installer.sh'${nc}" >&2
                echo -e "\nExiting..."
                exit 1
            fi
        }
    }

#
################################################################################
#
# [ Main ]
#
# Executes the sub-master installer that corresponds to the system's Linux
# Distribution (i.e. Ubuntu, Debian, CentOS, RHEL)
#
################################################################################
#
    detect_distro_ver_arch_bits
    export distro sver ver arch bits codename
    export yellow green cyan red nc clrln

    echo "SYSTEM INFO"
    echo "Bit Type: $bits"
    echo "Architecture: $arch"
    echo -n "Linux Distro: "
    if [[ -n $pname ]]; then echo "$pname"; else echo "$distro"; fi
    echo "Linux Distro Version: $ver"
    echo ""

    if [[ $distro = "ubuntu" ]]; then
        case "$ver" in
            16.04)
                # B.1. MongoDB only works on 64 bit systems
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
                # B.1.
                if [[ $bits = 64 ]]; then
                    execute_centos_rhel_installer
                else
                    supported=false
                fi
                ;;
            8)
                # B.1.
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
        echo "${red}Your operating system/Linux Distribution does not support" \
            "the installation, setup, and/or use of BulletBot${nc}" >&2
        echo -e "\nExiting..."
        exit 1
    fi
