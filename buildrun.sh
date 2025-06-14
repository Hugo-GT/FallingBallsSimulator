#!/bin/bash

# Remove build directory if it exists
rm -rf build

# Create build directory
mkdir build

# Navigate to build directory
cd build

# Generate build files
cmake ..

# Build the project
cmake --build .

# Run the executable
./FallingBallsSimulator 