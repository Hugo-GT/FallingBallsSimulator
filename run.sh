#!/bin/bash

if [ -f "build/FallingBallsSimulator" ]; then
    ./build/FallingBallsSimulator
else
    echo "Error: FallingBallsSimulator executable not found in build directory."
    echo "Please run ./build.sh first to build the project."
    exit 1
fi 