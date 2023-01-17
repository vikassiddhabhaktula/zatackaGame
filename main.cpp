#include "settings.h"
#include "player.h"
#include "database.h"
#include "display.h"
#include <ios>
#include <limits>
#include <vector>
#include <memory>
#include <queue>
//  OpenGL stuff
#include <homebrew_include/GL/glew.h>
#include <homebrew_include/GLFW/glfw3.h>

using std::cout;
using std::cin;

void showLogo() {
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "##                    ZATACKA for Friends                                ##\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
    std::cout << "===========================================================================\n";
}


int main() {
    // Window dimensions
    const uint32_t width = 1280;
    const uint32_t height = 720;
    //  Create display
    unique_ptr<Display> display = make_unique<Display>(width, height);
    //  Launch the display once the player setup is done
    display->start_display();
    //  Move the below code to openGL
    showLogo();
    //  Create some random game settings
    GameSettings first_game(2U, 3U);
    auto numPlayers = first_game.getNumPlayers();
    auto numRounds = first_game.getNumRounds();
    LOG("Num Players: ", (uint32_t) numPlayers);
    LOG("Num Rounds: ", numRounds);
    //  Create players
    //  TODO: Make it iterable once cin is fixed.
    shared_ptr<Player> player[numPlayers];
    uint8_t id = 0;
    auto &db = DataBase::getDataBase();
    db.storeKeyPlayerPair('a', id, keyType::LEFT);
    db.storeKeyPlayerPair('s', id, keyType::POWER);
    db.storeKeyPlayerPair('d', id, keyType::RIGHT);
    player[id] = make_shared<Player>(id, "Vikas", colorType::RED, powerType::HOLE, "asd");
    ++id;
    db.storeKeyPlayerPair('j', id, keyType::LEFT);
    db.storeKeyPlayerPair('k', id, keyType::POWER);
    db.storeKeyPlayerPair('l', id, keyType::RIGHT);
    player[id] = make_shared<Player>(id, "Alpha", colorType::BLUE, powerType::WALL, "jkl");
    //  Start game
    for (int i = numRounds; i >= 0; --i) {
        /*  Launch game threads:
            *  -   Threads wait for a trigger to start at the same time
            *  -   Each thread is scheduled round robin with same priority, timeslice 20 ms ?
            *  -   Watch for end round flag from the game and quit if needed
            */

        //  Trigger start

        //  Wait for game threads to finish
    }
    //  Check which player scored the highest & declare winner
    //  Do you want to play another game ?
    auto anotherGame = false;
    if (false == anotherGame) {
        cout << "END GAME :)" << endl;
    }
    return 0;
}