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
- from `app/config/example.conf` to `app/config/default.conf` 
- from `app/config/streams/example.conf` to `app/config/streams/mycam1.conf`

#### Edit

- your `.env` file and your camera configs in `app/config/streams/`

#### Run

```bash
chmod +x ./setup.sh
./setup.sh
```

## Run

#### simply
```bash
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

