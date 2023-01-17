#ifndef PLAYER_H 
#define PLAYER_H

#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;
#include "common.h"

class Player {
    uint8_t _id;
    string _name;
    colorType _color;
    powerType _power;
    unordered_map <char, keyType> _keys;
    bool _alive;
    public:
        bool isAlive() const;
        void kill();
        powerType getPower() const;
        uint8_t getId() const;
        string getName() const;
        Player(uint8_t id, string name, colorType color, powerType power,
            const char *keys);
};

#endif // !PLAYER_H 