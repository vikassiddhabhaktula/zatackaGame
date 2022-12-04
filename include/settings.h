#ifndef SETTINGS_H
#define SETTINGS_H

#include <iostream>
#include "common.h"

class GameSettings {
    uint8_t _numPlayers;
    uint32_t _numRounds;
    gameSpeed _gameSpeed;
    public:
        GameSettings(uint8_t numPlayers, uint32_t numRounds) :
            _numPlayers(numPlayers), _numRounds(numRounds),
            _gameSpeed(gameSpeed::SLOW) {}
        GameSettings() :
            _numPlayers(2U), _numRounds(4U), _gameSpeed(gameSpeed::SLOW) {} 
        //  Setters and getters
        void setGameSpeed(const gameSpeed&);
        void setNumPlayers(const uint8_t&);
        void setNumRounds(const uint32_t&);
        gameSpeed getGameSpeed() const;
        uint8_t getNumPlayers() const;
        uint32_t getNumRounds() const;
};

#endif // !SETTINGS_H