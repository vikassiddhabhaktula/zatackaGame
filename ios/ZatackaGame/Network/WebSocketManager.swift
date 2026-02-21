import Foundation
import Combine

@MainActor
class WebSocketManager: ObservableObject {
    @Published var isConnected = false
    @Published var roomId: String?
    @Published var playerId: Int?
    @Published var myColorIndex: Int = 0
    @Published var isHost = false
    @Published var players: [PlayerInfo] = []
    @Published var gameActive = false
    @Published var countdownValue: Int?
    @Published var errorMessage: String?
    @Published var gameOverData: GameOverInfo?

    var onGameState: (([PlayerStateUpdate]) -> Void)?
    var onRoundStart: (([SpawnInfo]) -> Void)?
    var onPlayerDied: ((Int, [String: Int]) -> Void)?
    var onRoundEnd: ((Int?, [String: Int]) -> Void)?

    private var webSocketTask: URLSessionWebSocketTask?
    private var isReceiving = false

    struct GameOverInfo {
        let winnerId: Int
        let scores: [String: Int]
    }

    func connect() {
        guard let url = URL(string: GameConstants.serverURL) else { return }
        let session = URLSession(configuration: .default)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        isConnected = true
        receiveMessage()
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        roomId = nil
        playerId = nil
        isHost = false
        players = []
        gameActive = false
        countdownValue = nil
        errorMessage = nil
        gameOverData = nil
    }

    func createRoom(name: String) {
        connect()
        // Small delay to ensure connection is established
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.send(CreateRoomMessage(name: name))
        }
    }

    func joinRoom(code: String, name: String) {
        connect()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.send(JoinRoomMessage(roomId: code.uppercased(), name: name))
        }
    }

    func startGame() {
        send(StartGameMessage())
    }

    func sendInput(dir: Int) {
        send(InputMessage(dir: dir))
    }

    func usePower() {
        send(UsePowerMessage())
    }

    private func send<T: Codable>(_ message: T) {
        guard let data = try? JSONEncoder().encode(message),
              let string = String(data: data, encoding: .utf8) else { return }
        webSocketTask?.send(.string(string)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8) {
                        let serverMsg = ServerMessage.parse(from: data)
                        Task { @MainActor in
                            self?.handleMessage(serverMsg)
                        }
                    }
                case .data(let data):
                    let serverMsg = ServerMessage.parse(from: data)
                    Task { @MainActor in
                        self?.handleMessage(serverMsg)
                    }
                @unknown default:
                    break
                }
                self?.receiveMessage() // Continue receiving
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                Task { @MainActor in
                    self?.isConnected = false
                }
            }
        }
    }

    private func handleMessage(_ message: ServerMessage) {
        switch message {
        case .roomCreated(let roomId, let playerId, let color):
            self.roomId = roomId
            self.playerId = playerId
            self.myColorIndex = color
            self.isHost = true
            self.players = [PlayerInfo(id: playerId, name: "You", colorIndex: color, isHost: true)]

        case .roomJoined(let roomId, let playerId, let color, let players):
            self.roomId = roomId
            self.playerId = playerId
            self.myColorIndex = color
            self.isHost = false
            self.players = players

        case .playerJoined(_, let players):
            self.players = players

        case .playerLeft(_, let players):
            self.players = players

        case .countdown(let seconds):
            self.countdownValue = seconds
            self.gameActive = true

        case .roundStart(let spawns):
            self.countdownValue = nil
            onRoundStart?(spawns)

        case .gameState(let players):
            onGameState?(players)

        case .playerDied(let playerId, let scores):
            onPlayerDied?(playerId, scores)

        case .roundEnd(let winnerId, let scores):
            onRoundEnd?(winnerId, scores)

        case .gameOver(let winnerId, let scores):
            self.gameActive = false
            self.gameOverData = GameOverInfo(winnerId: winnerId, scores: scores)

        case .error(let message):
            self.errorMessage = message

        case .unknown:
            break
        }
    }
}
