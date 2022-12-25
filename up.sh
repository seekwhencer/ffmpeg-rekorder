#!/bin/bash

export HOST_IP=$(hostname -I | cut -d ' ' -f1)
export HOST_NAME=$(hostname)


echo ""
read -p "Start dnsmasq? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-dnsmasq.yml down
  docker-compose -f docker-compose-dnsmasq.yml up -d
fi

echo ""
read -p "Start samba? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-samba.yml down
  docker-compose -f docker-compose-samba.yml up -d
fi

echo ""
read -p "Start the app-container? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-app.yml down
  docker-compose -f docker-compose-app.yml up -d
fi

echo ""
read -p "Start the app? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker exec -it ffmpeg-rekorder_app sh -c "/usr/local/bin/node --experimental-modules --experimental-json-modules index.js"
fi

docker ps -a