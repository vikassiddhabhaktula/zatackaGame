import SwiftUI
import SpriteKit

struct GameContainerView: View {
    @EnvironmentObject var wsManager: WebSocketManager
    @State private var gameScene: GameScene?
    @State private var showGameOver = false

    var body: some View {
        ZStack {
            if let scene = gameScene {
                SpriteView(scene: scene)
                    .ignoresSafeArea()
            } else {
                Color.black.ignoresSafeArea()
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            }
        }
        .onAppear {
            let scene = GameScene(size: CGSize(
                width: GameConstants.fieldWidth,
                height: GameConstants.fieldHeight
            ))
            scene.scaleMode = .aspectFit
            scene.wsManager = wsManager
            gameScene = scene
        }
        .onChange(of: wsManager.gameOverData != nil) { isGameOver in
            if isGameOver {
                showGameOver = true
            }
        }
        .navigationDestination(isPresented: $showGameOver) {
            GameOverView()
                .environmentObject(wsManager)
        }
        .navigationBarHidden(true)
        .navigationBarBackButtonHidden(true)
    }
}
