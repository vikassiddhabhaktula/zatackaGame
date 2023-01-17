#include "player.h"

Player::Player(uint8_t id, string name, colorType color, powerType power,
    const char *keys) {
    _id = id;
    _name = name;
    _color = color;
    _power = power;
    _keys[keys[0]] = keyType::LEFT;
    _keys[keys[1]] = keyType::POWER;
    _keys[keys[2]] = keyType::RIGHT;
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

uint8_t Player::getId() const {
    return _id;
}

string Player::getName() const {
    return _name;
} 