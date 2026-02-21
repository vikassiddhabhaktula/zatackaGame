import SwiftUI

struct GameOverView: View {
    @EnvironmentObject var wsManager: WebSocketManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                // Title
                Text("GAME OVER")
                    .font(.system(size: 40, weight: .black, design: .monospaced))
                    .foregroundColor(.white)

                // Winner
                if let gameOver = wsManager.gameOverData {
                    let winnerPlayer = wsManager.players.first(where: { $0.id == gameOver.winnerId })
                    let winnerColorIndex = winnerPlayer?.colorIndex ?? 0
                    let winnerName = winnerPlayer?.name ?? "Player \(gameOver.winnerId)"

                    VStack(spacing: 8) {
                        Text("Winner")
                            .font(.subheadline)
                            .foregroundColor(.gray)

                        Text(winnerName)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(Color(GameConstants.playerColors[winnerColorIndex]))
                    }

                    // Scores
                    VStack(spacing: 4) {
                        Text("Final Scores")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.bottom, 8)

                        let sortedScores = gameOver.scores.sorted { $0.value > $1.value }

                        ForEach(sortedScores, id: \.key) { idStr, score in
                            if let playerId = Int(idStr),
                               let player = wsManager.players.first(where: { $0.id == playerId }) {
                                HStack {
                                    Circle()
                                        .fill(Color(GameConstants.playerColors[player.colorIndex]))
                                        .frame(width: 12, height: 12)

                                    Text(player.name)
                                        .foregroundColor(Color(GameConstants.playerColors[player.colorIndex]))
                                        .font(.body)

                                    Spacer()

                                    Text("\(score)")
                                        .foregroundColor(.white)
                                        .font(.system(.body, design: .monospaced))
                                        .fontWeight(.bold)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(
                                    playerId == gameOver.winnerId
                                        ? Color.yellow.opacity(0.1)
                                        : Color.white.opacity(0.05)
                                )
                                .cornerRadius(8)
                            }
                        }
                    }
                    .padding(.horizontal, 40)
                }

                Spacer()

                // Play Again button
                Button(action: {
                    wsManager.disconnect()
                    dismiss()
                }) {
                    Text("Play Again")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 32)
            }
        }
        .navigationBarHidden(true)
        .navigationBarBackButtonHidden(true)
    }
}
