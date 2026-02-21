import SpriteKit

enum GameConstants {
    static let fieldWidth: CGFloat = 800
    static let fieldHeight: CGFloat = 600
    static let speed: CGFloat = 1.8
    static let turnRate: CGFloat = 0.05
    static let trailWidth: CGFloat = 3

    static let playerColors: [UIColor] = [
        .red, .green, UIColor(red: 0, green: 0.4, blue: 1, alpha: 1),
        .magenta, .yellow, .white,
        .orange, .cyan
    ]

    static let colorNames = ["Red", "Green", "Blue", "Magenta", "Yellow", "White", "Orange", "Cyan"]

    // Server URL - change this to your Render deployment URL
    static let serverURL = "wss://zatacka-server.onrender.com"
    // For local testing:
    // static let serverURL = "ws://localhost:3000"
}
