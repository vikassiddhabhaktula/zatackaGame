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
    unordered_map<char, pair<uint8_t, keyType>> _key2PlayerMap;
    DataBase() {};
    public:
        DataBase(DataBase const&) = delete;
        void operator=(DataBase const &) = delete;
        uint8_t getPlayerId(const char& key);
        static DataBase& getDataBase();
        keyType getKeyType(const char& key);
        errorType storeKeyPlayerPair(const char& key, const uint8_t& id,
            const keyType& keytype);
};

#endif // !DATABASE_H