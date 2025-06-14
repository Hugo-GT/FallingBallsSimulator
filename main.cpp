#define _XOPEN_SOURCE 700
#include <iostream>
#include <termios.h>
#include <linux/termios.h>
#include <vector>
#include <thread>
#include <chrono>
#include <cstdio>
#include <cctype>
#include <sys/types.h>
#include <unistd.h>
#include <sys/select.h>
#ifndef STDIN_FILENO
#define STDIN_FILENO 0
#endif

class Game {
private:
    static const int LANE_SIZE = 5;
    static const int NUM_LANES = 2;
    std::vector<std::vector<char>> lanes[NUM_LANES];
    int currentLane;
    int currentRow;
    int currentCol;
    bool gameRunning;

    // Helper function to get a keypress with timeout (in milliseconds)
    char getKeyWithTimeout(int timeout_ms) {
        struct termios oldt, newt;
        tcgetattr(STDIN_FILENO, &oldt);
        newt = oldt;
        newt.c_lflag &= ~(ICANON | ECHO);
        tcsetattr(STDIN_FILENO, TCSANOW, &newt);

        fd_set set;
        struct timeval timeout;
        FD_ZERO(&set);
        FD_SET(STDIN_FILENO, &set);
        timeout.tv_sec = timeout_ms / 1000;
        timeout.tv_usec = (timeout_ms % 1000) * 1000;

        char ch = 0;
        int rv = select(STDIN_FILENO + 1, &set, NULL, NULL, &timeout);
        if (rv > 0) {
            read(STDIN_FILENO, &ch, 1);
        }

        tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
        return ch;
    }

public:
    Game() : currentLane(0), currentRow(0), currentCol(0), gameRunning(true) {
        // Initialize both lanes
        for (int lane = 0; lane < NUM_LANES; lane++) {
            lanes[lane] = std::vector<std::vector<char>>(LANE_SIZE, 
                std::vector<char>(LANE_SIZE, '.'));
        }
    }

    void clearScreen() {
        // ANSI escape sequence to clear screen
        std::cout << "\033[2J\033[1;1H";
    }

    void display() {
        clearScreen();
        std::cout << "Falling Balls Game\n\n";
        
        // Display both lanes side by side
        for (int row = 0; row < LANE_SIZE; row++) {
            // Left lane
            std::cout << "|";
            for (int col = 0; col < LANE_SIZE; col++) {
                std::cout << lanes[0][row][col];
            }
            std::cout << "|  ";
            
            // Right lane
            std::cout << "|";
            for (int col = 0; col < LANE_SIZE; col++) {
                std::cout << lanes[1][row][col];
            }
            std::cout << "|\n";
        }
        std::cout << "\n";
    }

    void update() {
        // Clear previous position
        lanes[currentLane][currentRow][currentCol] = '.';
        
        // Update position
        currentCol++;
        if (currentCol >= LANE_SIZE) {
            currentCol = 0;
            currentRow++;
            if (currentRow >= LANE_SIZE) {
                currentRow = 0;
                currentLane = (currentLane + 1) % NUM_LANES;
            }
        }
        
        // Set new position
        lanes[currentLane][currentRow][currentCol] = 'O';
    }

    void run() {
        while (gameRunning) {
            display();
            // Check if the ball is at the last cell of a lane
            if (currentRow == LANE_SIZE - 1 && currentCol == LANE_SIZE - 1) {
                std::cout << "Catch the ball! Press 'A' for left lane or 'L' for right lane!\n";
                char expected = (currentLane == 0) ? 'A' : 'L';
                char input = getKeyWithTimeout((currentLane == 0) ? 240 : 280);
                if (toupper(input) != expected) {
                    std::cout << "Game Over! You missed the ball.\n";
                    gameRunning = false;
                    break;
                }
            } else {
                if (currentLane == 0) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(240));
                } else {
                    std::this_thread::sleep_for(std::chrono::milliseconds(280));
                }
            }
            update();
        }
    }
};

int main() {
    Game game;
    game.run();
    return 0;
} 