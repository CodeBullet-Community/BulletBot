# Introduction

When BulletBot is running in the background with auto-restart, the installers can send a report via postfix/sendmail on BulletBot's startup status. The report lists whether or not BulletBot was successfully started, the exit status of essential services, and the startup logs of three services that can be used to help identify errors that might have occurred during BulletBot's startup.

Here is an example of what the status report might look like:

```txt
From: root
To: [email@example.com]
Subject: BulletBot Startup Status Reports

Successfully started bulletbot.service

Service exit status codes:
    mongod.service status: active
    bulletbot.service status: active

-------- mongod.service startup logs --------
[startup logs]
-------- End of mongod.service startup logs --------

-------- bulletbot.service startup logs --------
[startup logs]
-------- End of bulletbot.service startup logs --------

-------- bullet-mongo-start.service startup log --------
[startup logs]
-------- End of bullet-mongo-start.service startup log --------
```

!!! Note
    For the rest of this guide, this feature will be referred to as BSSR.

## Configuring Auto-Restart

The configurations that enable BSSR are located in `bullet-mongo-start.conf`. To use BSSR, you will need to modify this config file.

Follow the instructions below to enable BSSR:

1. Change your working directory: `cd /home/bulletbot/installers/Linux_Universal/auto-restart/`
2. Copy the config file, replacing the `conf` extension with `local`: `sudo cp bullet-mongo-start.conf bullet-mongo-start.local`
3. Change the ownership of the new file: `sudo chown bulletbot:bulletbot bullet-mongo-start.local`
4. Open the newly created file with your favorite text editor (use sudo when opening the file).
5. Uncomment both `SendStatus` and `MailTo`
6. Replace `email1@example.com, email2@example.com`, located in `MailTo`, with the email addresses you want future status reports sent to
    * You may add more than one address to this variable, using a comma to separate each one
7. Save and exit the file

!!! warning "Configuration modifications"
    All modifications to the config file should always be done to `bullet-mongo-start.local`, as `bullet-mongo-start.conf` is overwritten every time you download/update BulletBot.

## Setting Up Postfix

After configuring the installers to use BSSR, it's time to install Postfix, which is a free and open-source mail transfer agent. In this guide, we'll be explaining how to set Postfix up using an existing Gmail account. We will also install mailutils/mailx so that we can send a test email. Where necessary, we will install supplemental SASL libraries.

### 1. Install Required Software

Debian, Ubuntu: `sudo apt update && sudo apt install postfix mailutils`

CentOS, RHEL: `sudo yum -y install postfix cyrus-sasl-plain mailx`

When prompted for "General type of mail configuration," choose "Internet Site".

When prompted for a "Mail name," choose a hostname to be used in mail headers as the origin of your emails. A fully-qualified domain name is preferred, but using your machine's simple hostname is OK. Regardless of what you enter here, your return address will appear to recipients as your Gmail address.

You may be prompted to set the "Root and postmaster mail recipient." Enter root, or another user who should receive mail subsystem notifications.

For any other prompts, you can choose the default values.

### 2. Configure Gmail Authentication

In the authentication information below, replace username with your Gmail username and password with a Gmail app password. If you do not have a Gmail app password, create one following [this guide](https://www.linode.com/docs/email/postfix/configure-postfix-to-send-mail-using-gmail-and-google-apps-on-debian-or-ubuntu/#generate-an-app-password-for-postfix).

The password file will reside in the Postfix configuration directory. The file can be named whatever you like, but the recommended filename is `sasl_passwd`.

1. Create or edit `/etc/postfix/sasl_passwd` using your favorite text editor (use sudo when opening/creating the file).
2. Add the line: `[smtp.gmail.com]:587 username@gmail.com:password`
    * Make sure to replace username with your Gmail username and password with a Gmail app password.
3. Save and exit the file.
4. Change the permissions of the file: `sudo chmod 600 /etc/postfix/sasl_passwd`

### 3. Configure Postfix

Six parameters must be set in the Postfix configuration file `main.cf`. To set these parameters:

### Debian, Ubuntu

1. Open `/etc/postfix/main.cf` with your favorite text editor (use sudo when opening the file).
2. Add or modify the following values:

        relayhost = [smtp.gmail.com]:587
        smtp_sasl_auth_enable = yes
        smtp_sasl_security_options = noanonymous
        smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
        smtp_tls_security_level = encrypt
        smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt

3. Save and exit the file.

### CentOS, RHEL

1. Open `/etc/postfix/main.cf` with your favorite text editor (use sudo when opening the file).
2. Add or modify the following values:

        relayhost = [smtp.gmail.com]:587
        smtp_use_tls = yes
        smtp_sasl_auth_enable = yes
        smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
        smtp_tls_CAfile = /etc/ssl/certs/ca-bundle.crt
        smtp_sasl_security_options = noanonymous
        smtp_sasl_tls_security_options = noanonymous

3. Save and exit the file.

### 4. Process Password File

Use postmap to compile and hash the contents of sasl_passwd. The results will be stored in your Postfix configuration directory in the file `sasl_passwd.db`.

`sudo postmap /etc/postfix/sasl_passwd`

### 5. Restart Postfix

Restart the Postfix service, putting your changes into effect.

`sudo systemctl restart postfix.service`

### 6. Enable "Less Secure Apps" In Gmail

By default, only the most secure sign-ins, such as logging in to Gmail on the web, are allowed for your Gmail account. To permit relay requests, log in to your Gmail account and turn on "Allow less secure apps."

For more information, review the Google Support document, "Allowing less secure apps to access your account."

### Postfix Setup Sources

All the information on how to set Postfix up was taken from different sources on the web. Links to all of the references are posted below.

Sources:

* <https://www.howtoforge.com/tutorial/configure-postfix-to-use-gmail-as-a-mail-relay/>
* <https://www.linode.com/docs/email/postfix/configure-postfix-to-send-mail-using-gmail-and-google-apps-on-debian-or-ubuntu/#generate-an-app-password-for-postfix>
* <https://kifarunix.com/configure-postfix-to-use-gmail-smtp-on-ubuntu-18-04/>
* <https://devops.ionos.com/tutorials/configure-a-postfix-relay-through-gmail-on-centos-7/>
