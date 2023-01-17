#include "database.h"

DataBase& DataBase::getDataBase() {
    static DataBase db;
    return db;
}

errorType DataBase::storeKeyPlayerPair(const char& key, const uint8_t& id,
        const keyType& keytype) {
    if (_key2PlayerMap.find(key) != _key2PlayerMap.end()) {
        LOG("ERR: Key already present with id: ",
            (uint32_t)getPlayerId(key));
        return errorType::EBADPARM;
    }
    _key2PlayerMap[key] = {id, keytype};
    return errorType::SUCCESS;
}

uint8_t DataBase::getPlayerId(const char& key) {
    return _key2PlayerMap[key].first;
}

keyType DataBase::getKeyType(const char& key) {
    return _key2PlayerMap[key].second;
}