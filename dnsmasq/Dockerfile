FROM alpine:latest

# fetch dnsmasq
RUN apk update \
    && apk --no-cache add dnsmasq

#configure dnsmasq
RUN mkdir -p /etc/default/
RUN echo -e "ENABLED=1\nIGNORE_RESOLVCONF=yes" > /etc/default/dnsmasq

ENTRYPOINT ["dnsmasq"]
