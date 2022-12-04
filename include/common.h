#ifndef COMMON_H
#define COMMON_H

#include <iostream>
#include <initializer_list>

enum class keyType { LEFT, POWER, RIGHT};
enum class powerType { HOLE, WALL, BORDER};
enum class gameSpeed {SLOW, MEDIUM, FAST};
typedef uint8_t playerIdType;
#define MAX_KEYS 3U
#define MAX_PLAYERS 8U
#define MAX_ROUNDS 10U

struct Point {
    uint32_t x;
    uint32_t y;
    Point(uint32_t x_in, uint32_t y_in):
        x(x_in), y(y_in) {}
};

template<typename... Args>
void LOG(Args... args) {
    (std::cout << ... << args) << "\n";
}

#endif // !COMMON_H
