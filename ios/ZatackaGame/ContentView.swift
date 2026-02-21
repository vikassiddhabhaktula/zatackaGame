import SwiftUI

struct ContentView: View {
    @StateObject private var wsManager = WebSocketManager()

    var body: some View {
        NavigationStack {
            LobbyView()
        }
        .environmentObject(wsManager)
    }
}
