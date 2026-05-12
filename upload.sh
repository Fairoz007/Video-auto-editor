#!/bin/bash

echo "Starting automated upload..."

# Run the node script passing the config
node upload.js --config=config.json

echo "Upload completed."
