#include "player.h"

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