#ifndef SETTINGS_H
#define SETTINGS_H

#include <iostream>
#include "common.h"

class GameSettings {
    playerIdType _numPlayers;
    uint32_t _numRounds;
    gameSpeed _gameSpeed;
    GameSettings();
    public:
        GameSettings(GameSettings const&) = delete;
        void operator=(GameSettings const&) = delete;
        //  Singleton constructor
        static GameSettings& getSettings();
        void setGameSpeed(const gameSpeed&);
        void setNumPlayers(const playerIdType&);
        void setNumRounds(const uint32_t&);
        gameSpeed getGameSpeed();
        playerIdType getNumPlayers();
        uint32_t getNumRounds();
};

#endif // !SETTINGS_H