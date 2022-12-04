#ifndef PLAYER_H 
#define PLAYER_H

#include <iostream>
#include <string>
using namespace std;
#include "common.h"

class Player {
    uint8_t _id;
    string _name;
    string _color;
    powerType _power;
    bool _alive;
    public:
        bool isAlive() const;
        void kill();
        powerType getPower() const;
        uint8_t getId() const;
        string getName() const;
        Player(uint8_t id, string name, string color, powerType power) :
            _id(id), _name(name), _color(color), _power(power), _alive(true) {}
};

#endif // !PLAYER_H 