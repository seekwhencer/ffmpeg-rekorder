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

## Config

#### Duplicate
- from `.env.example` to `.env`
- from `dnsmasq/example.conf` to `dnsmasq/dnsmasq.conf`
- from `app/config/example.conf` to `app/config/default.conf`
- from `app/config/streams/conf.example` to `app/config/streams/mycam1.conf`

#### Edit

- all duplicated files with your own settings
- to create multiple stream configs, create `mycam1.conf`, `mycam2.conf`, `...` in `app/config/streams/`


### `.env`

- `PROJECT_NAME`  
    Prefix for the container name.
  

- `DOCKER_COMPOSE_SOURCE`  
    The binary URL from github.
  

- `HOST_STORE_ROOT_PATH`  
    The absolute path to the storage root directory on the docker host.
  

- `STORE_ROOT_PATH`  
    The absolute storage path in the container.  
  

- `STORE_FILE_PREFIX`  
    FFmpeg parameter syntax for:`strftime` ([FFmpeg Documentation](https://ffmpeg.org/ffmpeg-formats.html#toc-segment_002c-stream_005fsegment_002c-ssegment))
  

- `SEGMENT_TIME`  
    FFmpeg parameter syntax for:`segment_time` ([FFmpeg Documentation](https://ffmpeg.org/ffmpeg-formats.html#toc-segment_002c-stream_005fsegment_002c-ssegment))
  

### `app/config/default.conf`

- `DEBUG`  
    Verbose on, off
  

- `SERVER_PORT`  
    The listen port for the web app and api
  

- `MQTT_HOST`  
    The mqtt host or ip
  

- `MQTT_PORT`  
    The mqtt port
  

- `MQTT_CLIENT_ID`  
    The mqtt client id for the app

### `app/config/streams/mycam.conf` (multiple camera configs)
- `NAME`  
    The name of the camera or stream
  

- `ENABLED`  
    Is the camera enabled on app start
  

- `CHECK_INTERVAL_DURATION`  
    Milliseconds to check if a stream is available
  

- `SEGMENT_TIME`  
    Duration of a file. If not set, value comes from `.env` 
  

- `FILE_PREFIX`  
    Same `STORE_FILE_PREFIX` from `.env` or changed
  

- `STREAM_URL`  
    The reachable stream url from the ip camera.  
  

- `AUTO_RECORD`  
    `1` or `0` to start recording if the cam is available  
  

- `MQTT_ENABLE`  
  `1` or `0`
  

- `MQTT_TOPIC_ENABLE`  
    The publish topic to commit the enabled state `1` or `0`
  

- `MQTT_TOPIC_RECORD`  
    The publish topic to commit the recording state `1` or `0`
  

- `MQTT_CONTROL_TOPIC_ENABLE`  
  The subscribed topic to enable or disable the stream with `1` or `0`


- `MQTT_CONTROL_TOPIC_RECORD`  
  The subscribed topic to start or stop the recording with `1` or `0`


- `MQTT_TOPIC_VALUE_ON=1`
- `MQTT_TOPIC_VALUE_OFF=0`
- `MQTT_CONTROL_VALUE_ON=1`
- `MQTT_CONTROL_VALUE_OFF=0`


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

## Development
