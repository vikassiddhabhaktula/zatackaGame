#include "database.h"

DataBase& DataBase::getDataBase() {
    static DataBase db;
    return db;
}

void DataBase::storeKeyPlayerPair(const char& key, const playerIdType& id,
        const keyType& keytype) {
    _key2PlayerMap[key] = {id, keytype};
}

playerIdType DataBase::getPlayerId(const char& key) {
    return _key2PlayerMap[key].first;
}

keyType DataBase::getDirection(const char& key) {
    return _key2PlayerMap[key].second;
}

bool DataBase::isPowerKey(const char& key) {
    return (keyType::POWER == _key2PlayerMap[key].second);
}