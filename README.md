# Falling Balls Game

A terminal-based game where you must catch falling balls as they move through two alternating paths. The game tests your timing and reflexes as you manage multiple balls with different falling speeds.

## Game Mechanics

- The game features two paths: left and right
- Balls alternate between these paths
- Left path takes 6 seconds to complete
- Right path takes 7 seconds to complete
- Each ball follows a grid-like pattern, moving horizontally from position 1 to 5, then it goes down to the second collumn and goes from row 1 to 5 again and repeat this until it reaches collumn 12 row 5 at the very bottom right of the lane.
- You must catch balls when they reach the bottom of their path
- When you catch a ball, you can reset it to start over from the top
- New balls are added every 30 seconds
- You have 10 seconds to spawn a new ball when it becomes available
- Missing a ball or failing to spawn a new ball in time results in game over

## Controls

- `A` or `a`: Hold to catch a ball in the left path
- `L` or `l`: Hold to catch a ball in the right path
- `H` or `h`: Press to reset a caught ball to the top
- `Y` or `y`: Press to spawn a new ball when available

## Game Display

The game is displayed in the terminal with the following elements:
- Two vertical paths separated by walls
- Balls represented by 'O' characters
- Catch indicators showing when you're holding the catch keys
- Status messages at the bottom of the screen

## How to Play

1. The game starts with one ball in the left path
2. Hold `A` to catch a ball in the left path or `L` for the right path
3. When you catch a ball, press `H` to reset it to the top
4. Every 30 seconds, a new ball becomes available
5. Press `Y` to spawn the new ball when ready
6. Continue catching and resetting balls while managing the increasing number of balls
7. The game gets progressively more challenging as more balls are added

## Building and Running

To compile and run the game:
```bash
g++ main.cpp -o falling_balls
./falling_balls
```

## Requirements

- C++ compiler with C++11 support
- Terminal that supports ANSI escape codes
- Unix-like operating system (for terminal control)