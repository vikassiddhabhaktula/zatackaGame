import Foundation

// MARK: - Client -> Server Messages

struct CreateRoomMessage: Codable {
    let type: String = "create_room"
    let name: String
}

struct JoinRoomMessage: Codable {
    let type: String = "join_room"
    let roomId: String
    let name: String
}

struct StartGameMessage: Codable {
    let type: String = "start_game"
}

struct InputMessage: Codable {
    let type: String = "input"
    let dir: Int // -1, 0, 1
}

struct UsePowerMessage: Codable {
    let type: String = "use_power"
}

// MARK: - Server -> Client Messages

enum ServerMessage {
    case roomCreated(roomId: String, playerId: Int, color: Int)
    case roomJoined(roomId: String, playerId: Int, color: Int, players: [PlayerInfo])
    case playerJoined(player: PlayerInfo, players: [PlayerInfo])
    case playerLeft(playerId: Int, players: [PlayerInfo])
    case countdown(seconds: Int)
    case roundStart(spawns: [SpawnInfo])
    case gameState(players: [PlayerStateUpdate])
    case playerDied(playerId: Int, scores: [String: Int])
    case roundEnd(winnerId: Int?, scores: [String: Int])
    case gameOver(winnerId: Int, scores: [String: Int])
    case error(message: String)
    case unknown
}

struct PlayerInfo: Codable {
    let id: Int
    let name: String
    let colorIndex: Int
    var isHost: Bool?
}

struct SpawnInfo: Codable {
    let id: Int
    let x: CGFloat
    let y: CGFloat
    let angle: CGFloat
    let power: String?
}

struct PlayerStateUpdate: Codable {
    let id: Int
    let x: CGFloat
    let y: CGFloat
    let angle: CGFloat
    let alive: Bool
    let inGap: Bool
    var score: Int?
    var powerActive: Bool?
    var trailWidth: CGFloat?
}

// MARK: - Parsing

extension ServerMessage {
    static func parse(from data: Data) -> ServerMessage {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return .unknown
        }

        let decoder = JSONDecoder()

        switch type {
        case "room_created":
            return .roomCreated(
                roomId: json["roomId"] as? String ?? "",
                playerId: json["playerId"] as? Int ?? 0,
                color: json["color"] as? Int ?? 0
            )

        case "room_joined":
            let players = parseArray([PlayerInfo].self, from: json["players"], decoder: decoder)
            return .roomJoined(
                roomId: json["roomId"] as? String ?? "",
                playerId: json["playerId"] as? Int ?? 0,
                color: json["color"] as? Int ?? 0,
                players: players
            )

        case "player_joined":
            let player = parseObject(PlayerInfo.self, from: json["player"], decoder: decoder)
                ?? PlayerInfo(id: 0, name: "", colorIndex: 0)
            let players = parseArray([PlayerInfo].self, from: json["players"], decoder: decoder)
            return .playerJoined(player: player, players: players)

        case "player_left":
            let players = parseArray([PlayerInfo].self, from: json["players"], decoder: decoder)
            return .playerLeft(playerId: json["playerId"] as? Int ?? 0, players: players)

        case "countdown":
            return .countdown(seconds: json["seconds"] as? Int ?? 0)

        case "round_start":
            let spawns = parseArray([SpawnInfo].self, from: json["spawns"], decoder: decoder)
            return .roundStart(spawns: spawns)

        case "game_state":
            let players = parseArray([PlayerStateUpdate].self, from: json["players"], decoder: decoder)
            return .gameState(players: players)

        case "player_died":
            let scores = parseScores(json["scores"])
            let playerId = json["id"] as? Int ?? (json["playerId"] as? Int ?? 0)
            return .playerDied(playerId: playerId, scores: scores)

        case "round_end":
            let scores = parseScores(json["scores"])
            return .roundEnd(winnerId: json["winnerId"] as? Int, scores: scores)

        case "game_over":
            let scores = parseScores(json["scores"])
            return .gameOver(winnerId: json["winnerId"] as? Int ?? 0, scores: scores)

        case "error":
            return .error(message: json["message"] as? String ?? "Unknown error")

        default:
            return .unknown
        }
    }

    // MARK: - Parse Helpers

    private static func parseArray<T: Decodable>(_ type: T.Type, from value: Any?, decoder: JSONDecoder) -> T where T: Collection {
        guard let value = value,
              let data = try? JSONSerialization.data(withJSONObject: value),
              let result = try? decoder.decode(T.self, from: data) else {
            // Return empty array - this works because T is constrained to Collection
            // but we need to return the decoded type, so fallback gracefully
            return [] as! T
        }
        return result
    }

    private static func parseObject<T: Decodable>(_ type: T.Type, from value: Any?, decoder: JSONDecoder) -> T? {
        guard let value = value,
              let data = try? JSONSerialization.data(withJSONObject: value),
              let result = try? decoder.decode(T.self, from: data) else {
            return nil
        }
        return result
    }

    private static func parseScores(_ value: Any?) -> [String: Int] {
        guard let dict = value as? [String: Any] else { return [:] }
        var scores: [String: Int] = [:]
        for (key, val) in dict {
            if let intVal = val as? Int {
                scores[key] = intVal
            }
        }
        return scores
    }
}
