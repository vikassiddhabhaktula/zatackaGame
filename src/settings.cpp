#include "settings.h"

uint8_t GameSettings::getNumPlayers() const {
    return _numPlayers;
}

uint32_t GameSettings::getNumRounds() const {
    return _numRounds;
}

gameSpeed GameSettings::getGameSpeed() const {
    return _gameSpeed;
}

void GameSettings::setNumPlayers(const uint8_t& num) {
    _numPlayers = num;
}

void GameSettings::setNumRounds(const uint32_t& numRounds) {
    _numRounds = numRounds;
}

void GameSettings::setGameSpeed(const gameSpeed& speed) {
    _gameSpeed = speed;
}