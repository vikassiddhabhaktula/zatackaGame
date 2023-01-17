#pragma once

#include "common.h"
#include "player.h"

class Game {
    uint8_t _numActivePlayers;
    Game() {};
    public:
        Game(const Game&) = delete;
        static Game& createGame();
        errorType createPlayer(Player player);
        void startGame();
        void endGame();
};