#include <iostream>
#include <vector>
#include <thread>
#include <chrono>
#include <termios.h>
#include <fcntl.h>
#include <unistd.h>

class Game {
private:
    static const int LANE_SIZE = 5;
    static const int NUM_LANES = 2;
    std::vector<std::vector<char>> lanes[NUM_LANES];
    int currentLane;
    int currentRow;
    int currentCol;
    bool gameRunning;
    struct termios old_tio, new_tio;

    void setupTerminal() {
        // Get the terminal settings
        tcgetattr(STDIN_FILENO, &old_tio);
        new_tio = old_tio;
        
        // Disable canonical mode and echo
        new_tio.c_lflag &= ~(ICANON | ECHO);
        
        // Set the new settings
        tcsetattr(STDIN_FILENO, TCSANOW, &new_tio);
        
        // Set stdin to non-blocking mode
        int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
        fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK);
    }

    void restoreTerminal() {
        // Restore the old terminal settings
        tcsetattr(STDIN_FILENO, TCSANOW, &old_tio);
    }

    char getKey() {
        char key = ' ';
        if (read(STDIN_FILENO, &key, 1) == 1) {
            return key;
        }
        return ' ';
    }

public:
    Game() : currentLane(0), currentRow(0), currentCol(0), gameRunning(true) {
        setupTerminal();
        // Initialize both lanes
        for (int lane = 0; lane < NUM_LANES; lane++) {
            lanes[lane] = std::vector<std::vector<char>>(LANE_SIZE, 
                std::vector<char>(LANE_SIZE, '.'));
        }
    }

    ~Game() {
        restoreTerminal();
    }

    void clearScreen() {
        // ANSI escape sequence to clear screen
        std::cout << "\033[2J\033[1;1H";
    }

    void display() {
        clearScreen();
        std::cout << "Falling Balls Game\n\n";
        std::cout << "Press 'A' to catch in left lane, 'L' to catch in right lane\n\n";
        
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

        // Check if the ball reaches the bottom
        if (currentRow == LANE_SIZE - 1 && currentCol == LANE_SIZE - 1) {
            char key = getKey();
            
            if ((currentLane == 0 && key != 'A') || (currentLane == 1 && key != 'L')) {
                gameRunning = false;
                std::cout << "\nGame Over! You missed the ball!\n";
                return;
            }
        }
    }

    void run() {
        while (gameRunning) {
            display();
            update();
            if (currentLane == 0) {
                std::this_thread::sleep_for(std::chrono::milliseconds(240)); // 6 seconds for left lane
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(280)); // 7 seconds for right lane
            }
        }
    }
};

int main() {
    Game game;
    game.run();
    return 0;
} 