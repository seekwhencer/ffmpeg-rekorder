#!/bin/bash

export HOST_IP=$(hostname -I | cut -d ' ' -f1)
export HOST_NAME=$(hostname)


echo ""
read -p "dnsmasq? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-dnsmasq.yml down
fi

echo ""
read -p "Samba? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-samba.yml down
fi

echo ""
read -p "App Container? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-app.yml down
fi

docker ps -a