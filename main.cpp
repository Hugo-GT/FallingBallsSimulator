#include <iostream>
#include <vector>
#include <chrono>
#include <thread>
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>

using namespace std;
using namespace std::chrono;

const int SCREEN_HEIGHT = 20;
const int LEFT_PATH_DURATION = 6;
const int RIGHT_PATH_DURATION = 7;
const int PATH_TOP_Y = 1;
const int PATH_BOTTOM_Y = SCREEN_HEIGHT - 2;
const char BALL_CHAR = 'O';
const char EMPTY_CHAR = ' ';
const char WALL_CHAR = '|';

enum Lane { LEFT, RIGHT };

struct Ball {
    Lane lane;
    time_point<steady_clock> start_time;
    int duration;
    bool caught = false;
};

vector<Ball> balls;
char hold_key = '\0';  // 'A' or 'L'
bool ready_to_reset = false;
Lane caught_lane;

void setNonBlocking(bool enable) {
    static bool configured = false;
    static struct termios oldt;
    struct termios newt;
    if (enable && !configured) {
        tcgetattr(STDIN_FILENO, &oldt);
        newt = oldt;
        newt.c_lflag &= ~(ICANON | ECHO);
        tcsetattr(STDIN_FILENO, TCSANOW, &newt);
        fcntl(STDIN_FILENO, F_SETFL, O_NONBLOCK);
        configured = true;
    } else if (!enable && configured) {
        tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
        configured = false;
    }
}

int getBallY(const Ball& b) {
    auto now = steady_clock::now();
    float progress = duration_cast<milliseconds>(now - b.start_time).count() / 1000.0 / b.duration;
    return PATH_TOP_Y + (PATH_BOTTOM_Y - PATH_TOP_Y) * progress;
}

void drawFrame() {
    cout << "\033[2J\033[1;1H"; // Clear screen

    // Draw top bar
    cout << "+----------------- Falling Balls Game -----------------+\n";

    for (int y = 0; y < SCREEN_HEIGHT; ++y) {
        cout << WALL_CHAR;
        // Draw left path
        if (y == 0 || y == SCREEN_HEIGHT - 1) {
            cout << string(10, '-');
        } else {
            bool ball_drawn = false;
            for (const auto& b : balls) {
                if (b.lane == LEFT && !b.caught && getBallY(b) == y) {
                    cout << ' ' << BALL_CHAR << string(8, ' ');
                    ball_drawn = true;
                    break;
                }
            }
            if (!ball_drawn) cout << string(10, ' ');
        }

        cout << WALL_CHAR;

        // Draw right path
        if (y == 0 || y == SCREEN_HEIGHT - 1) {
            cout << string(10, '-');
        } else {
            bool ball_drawn = false;
            for (const auto& b : balls) {
                if (b.lane == RIGHT && !b.caught && getBallY(b) == y) {
                    cout << ' ' << BALL_CHAR << string(8, ' ');
                    ball_drawn = true;
                    break;
                }
            }
            if (!ball_drawn) cout << string(10, ' ');
        }

        cout << WALL_CHAR;

        // Draw catch indicators
        if (y == PATH_BOTTOM_Y) {
            if (hold_key == 'A') cout << "  [CATCHING]";
            else if (hold_key == 'L') cout << "         [CATCHING]";
        }

        cout << '\n';
    }

    cout << "+--------------------------------------------+\n";
    if (ready_to_reset)
        cout << "Ball caught! Press [H] to reset it to the top.\n";
    else
        cout << "Hold [A] or [L] to catch, [H] to reset caught ball.\n";
}

void updateBalls() {
    auto now = steady_clock::now();
    for (auto& b : balls) {
        if (b.caught) continue;
        int y = getBallY(b);
        if (y >= PATH_BOTTOM_Y) {
            if ((hold_key == 'A' && b.lane == LEFT) || (hold_key == 'L' && b.lane == RIGHT)) {
                b.caught = true;
                caught_lane = b.lane;
                ready_to_reset = true;
            } else {
                cout << "\nGAME OVER! You missed a ball.\n";
                setNonBlocking(false);
                exit(0);
            }
        }
    }
}

void handleInput() {
    char ch;
    while (read(STDIN_FILENO, &ch, 1) > 0) {
        if (ch == 'A' || ch == 'a') hold_key = 'A';
        else if (ch == 'L' || ch == 'l') hold_key = 'L';
        else if (ch == 'H' || ch == 'h') {
            if (ready_to_reset) {
                for (auto& b : balls) {
                    if (b.caught && b.lane == caught_lane) {
                        b.start_time = steady_clock::now();
                        b.caught = false;
                        ready_to_reset = false;
                        hold_key = '\0';
                        break;
                    }
                }
            }
        }
    }
}

void spawnBall(Lane lane) {
    balls.push_back(Ball{
        .lane = lane,
        .start_time = steady_clock::now(),
        .duration = (lane == LEFT) ? LEFT_PATH_DURATION : RIGHT_PATH_DURATION
    });
}

int main() {
    setNonBlocking(true);
    auto last_spawn_left = steady_clock::now();
    auto last_spawn_right = steady_clock::now();

    while (true) {
        auto now = steady_clock::now();

        // Spawn new balls periodically
        if (duration_cast<seconds>(now - last_spawn_left).count() >= 3) {
            spawnBall(LEFT);
            last_spawn_left = now;
        }
        if (duration_cast<seconds>(now - last_spawn_right).count() >= 4) {
            spawnBall(RIGHT);
            last_spawn_right = now;
        }

        handleInput();
        updateBalls();
        drawFrame();
        this_thread::sleep_for(chrono::milliseconds(100));
    }

    setNonBlocking(false);
    return 0;
}
