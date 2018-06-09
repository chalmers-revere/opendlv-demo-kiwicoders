# opendlv-demo-kiwicoders

This repository contains the interface and docker-compose files for the Kiwi
coders demo. In the demo, up to five Kiwi cars are connected to a server that
provides a JavaScript coding interface. Each Kiwi car is sending sensor data to
the server, and from the JavaScript code, actuation signals can be sent back.

## Setup

The demo assumes a LAN with a server with IP 192.168.1.2, and up to five Kiwi
cars with IPs 192.168.1.101, 192.168.1.102, 192.168.1.103, 192.168.1.104,
and 192.168.1.105.

The repository contains docker-compose files for each node.
