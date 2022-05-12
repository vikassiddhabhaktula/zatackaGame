#include "settings.h"

GameSettings::GameSettings() {
    _numPlayers = 2;
    _numRounds = 4;
    _gameSpeed = gameSpeed::MEDIUM;
}

GameSettings& GameSettings::getSettings() {
    static GameSettings settings;
    return settings;
}

playerIdType GameSettings::getNumPlayers() {
    return _numPlayers;
}

uint32_t GameSettings::getNumRounds() {
    return _numRounds;
}

void GameSettings::setNumPlayers(const playerIdType& num) {
    _numPlayers = num;
}

void GameSettings::setNumRounds(const uint32_t& numRounds) {
    _numRounds = numRounds;
}