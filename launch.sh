#!/bin/bash

# Open webrowser
chromium-browser                    \
    --remote-debugging-port=9222    \
    --no-first-run                  \
    --no-default-browser-check      \
    &> ./chromium.log              \
    &

sleep 1

# Get debug websocket
LINE=$(grep "^DevTools" ./chromium.log)
WS=`echo $LINE | cut -d ' ' -f4`

# Launch script 
echo "Arguments: $@ ${WS}"
node scrape.js $@ ${WS}