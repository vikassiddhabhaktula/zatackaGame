#ifndef PLAYER_H 
#define PLAYER_H

#include <iostream>
#include <string>
using namespace std;
#include "common.h"

class Player {
    uint8_t _id;
    bool _alive;
    string _name;
    string _color;
    powerType _power;
    public:
        bool isAlive() const;
        void kill();
        powerType getPower() const;
        Player(string name, string color, powerType power);
};

#endif // !PLAYER_H 