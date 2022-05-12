#ifndef DATABASE_H
#define DATABASE_H

#include "common.h"
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

//  DataBase will be a singleton class
class DataBase {
    //  map from key to player id and keyType
    unordered_map<char, pair<playerIdType, keyType>> _key2PlayerMap;
    DataBase() {};
    public:
        DataBase(DataBase const&) = delete;
        void operator=(DataBase const &) = delete;
        playerIdType getPlayerId(const char& key);
        keyType getDirection(const char& key);
        bool isPowerKey(const char& key);
        static DataBase& getDataBase();
        void storeKeyPlayerPair(const char& key, const playerIdType& id,
            const keyType& keytype);
};

#endif // !DATABASE_H