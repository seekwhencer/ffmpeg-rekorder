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
read -p "Start the app? (y)" CONT
echo ""
if [ "$CONT" = "y" ]; then
  docker-compose -f docker-compose-app.yml down
  docker-compose -f docker-compose-app.yml up -d
fi

docker ps -a