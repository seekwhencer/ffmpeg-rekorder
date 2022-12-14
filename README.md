# ffmpeg-rekorder

A little node.js app around **ffmpeg**, **dnsmasq** and **samba** to run it on a Raspberry Pi4.  

With this setup you can:

- record ip camera rtsp streams in segmented files with **ffmpeg**
- start automatically recording when a camera is available
- provide dhcp with **dnsmasq**
- provide local network shares with **samba**
- notify availability and active to a mqtt server
- instruct the app per **mqtt** to enable or disable recording for a stream


## Setup
#### Get it
```bash
git clone git@github.com:seekwhencer/ffmpeg-rekorder.git
```

#### Duplicate  
- from `.env.example` to `.env`
- from `dnsmasq/example.conf` to `dnsmasq/dnsmasq.conf`
- from `app/config/example.conf` to `app/config/default.conf` 
- from `app/config/streams/conf.example` to `app/config/streams/mycam1.conf`

#### Edit

- all duplicated files with your own settings
- to create multiple stream configs, create `mycam1.conf`, `mycam2.conf`, `...` in `app/config/streams/`

#### Network

- edit network config
```bash
sudo nano /etc/network/interfaces
```
- add this
```
source /etc/network/interfaces.d/*
```
- create eth1 config
```
sudo nano /etc/network/interface.d/eth1.conf
```
- add (and change) this
```
auto eth1
allow-hotplug eth1
iface eth1 inet static
address 192.168.179.1
netmask 255.255.255.0
gateway 192.168.179.1
broadcast 192.168.179.255
dns-nameservers 192.168.179.1
```


#### Run setup

```bash
chmod +x ./setup.sh
./setup.sh
```

## Run

#### simply
```bash
chmod +x ./up.sh
./up.sh
```

#### or one by one
```
docker-compose -f docker-compose-dnsmasq.yml up -d
docker-compose -f docker-compose-samba.yml up -d
docker-compose -f docker-compose-app.yml up -d
```

## Hardware

- Raspberry Pi 4
- 16 GB SSD min. internal
- SATA to USB 3
- Ethernet to USB 3
- External SSD
- POE Switch

## Scenario use case

- Eth0 on the Raspberry Pi is wired to hour local network router.
- The second ethernet is connected to the poe switch to provide connected lan clients an ip address.

## @TODO
- life span for recordings
- mqtt topic for availability and record state
- configurable mqtt topics

