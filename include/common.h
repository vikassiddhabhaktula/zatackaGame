#ifndef COMMON_H
#define COMMON_H

#include <iostream>

enum class keyType { LEFT, POWER, RIGHT};
enum class powerType { HOLE, WALL, BORDER};
enum class gameSpeed {SLOW, MEDIUM, FAST};
typedef uint8_t playerIdType;
#define MAX_KEYS 3U

#endif // !COMMON_H
