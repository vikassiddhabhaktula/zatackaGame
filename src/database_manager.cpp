#include "database.h"

DataBase& DataBase::getDataBase() {
    static DataBase db;
    return db;
}

void DataBase::storeKeyPlayerPair(const char& key, const uint8_t& id,
        const keyType& keytype) {
    _key2PlayerMap[key] = {id, keytype};
}

uint8_t DataBase::getPlayerId(const char& key) {
    return _key2PlayerMap[key].first;
}

keyType DataBase::getDirection(const char& key) {
    return _key2PlayerMap[key].second;
}

bool DataBase::isPowerKey(const char& key) {
    return (keyType::POWER == _key2PlayerMap[key].second);
}