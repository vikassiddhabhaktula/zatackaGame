#include "player.h"

Player::Player(string name, string color, powerType power) {
    _name = name;
    _color = color;
    _power = power;
    _alive = true;
}

bool Player::isAlive() const {
    return _alive;
} 

void Player::kill() {
    _alive = false;
}

powerType Player::getPower() const {
    return _power;
}