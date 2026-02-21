import SwiftUI

struct LobbyView: View {
    @EnvironmentObject var wsManager: WebSocketManager
    @State private var playerName: String = ""
    @State private var roomCode: String = ""
    @State private var showShareSheet = false
    @State private var navigateToGame = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if wsManager.roomId != nil {
                waitingRoomView
            } else {
                mainMenuView
            }
        }
        .navigationTitle("")
        .navigationBarHidden(true)
        .onChange(of: wsManager.gameActive) { active in
            if active {
                navigateToGame = true
            }
        }
        .navigationDestination(isPresented: $navigateToGame) {
            GameContainerView()
                .environmentObject(wsManager)
        }
        .alert("Error", isPresented: Binding<Bool>(
            get: { wsManager.errorMessage != nil },
            set: { if !$0 { wsManager.errorMessage = nil } }
        )) {
            Button("OK") { wsManager.errorMessage = nil }
        } message: {
            Text(wsManager.errorMessage ?? "")
        }
        .sheet(isPresented: $showShareSheet) {
            if let code = wsManager.roomId {
                ShareSheet(items: ["Join my Zatacka game! Open the app and enter code: \(code)"])
            }
        }
    }

    // MARK: - Main Menu

    private var mainMenuView: some View {
        VStack(spacing: 32) {
            Spacer()

            // Title
            Text("ZATACKA")
                .font(.system(size: 48, weight: .black, design: .monospaced))
                .foregroundColor(.white)
            Text("for Friends")
                .font(.system(size: 20, weight: .light, design: .monospaced))
                .foregroundColor(.gray)

            Spacer()

            // Player name input
            VStack(spacing: 8) {
                Text("Your Name")
                    .font(.caption)
                    .foregroundColor(.gray)
                TextField("Enter name", text: $playerName)
                    .textFieldStyle(GameTextFieldStyle())
                    .autocapitalization(.words)
                    .disableAutocorrection(true)
            }
            .padding(.horizontal, 40)

            // Create Room
            VStack(spacing: 12) {
                Button(action: {
                    guard !playerName.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    wsManager.createRoom(name: playerName.trimmingCharacters(in: .whitespaces))
                }) {
                    Text("Create Room")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .disabled(playerName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 40)

            // Divider
            HStack {
                Rectangle().frame(height: 1).foregroundColor(.gray.opacity(0.3))
                Text("OR").foregroundColor(.gray).font(.caption)
                Rectangle().frame(height: 1).foregroundColor(.gray.opacity(0.3))
            }
            .padding(.horizontal, 40)

            // Join Room
            VStack(spacing: 12) {
                TextField("Room Code", text: $roomCode)
                    .textFieldStyle(GameTextFieldStyle())
                    .autocapitalization(.allCharacters)
                    .disableAutocorrection(true)
                    .onChange(of: roomCode) { newValue in
                        roomCode = String(newValue.uppercased().prefix(4))
                    }

                Button(action: {
                    guard !playerName.trimmingCharacters(in: .whitespaces).isEmpty,
                          roomCode.count == 4 else { return }
                    wsManager.joinRoom(
                        code: roomCode,
                        name: playerName.trimmingCharacters(in: .whitespaces)
                    )
                }) {
                    Text("Join Room")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .disabled(
                    playerName.trimmingCharacters(in: .whitespaces).isEmpty
                    || roomCode.count != 4
                )
            }
            .padding(.horizontal, 40)

            Spacer()
        }
    }

    // MARK: - Waiting Room

    private var waitingRoomView: some View {
        VStack(spacing: 24) {
            Spacer()

            // Room code display
            VStack(spacing: 8) {
                Text("Room Code")
                    .font(.caption)
                    .foregroundColor(.gray)
                Text(wsManager.roomId ?? "")
                    .font(.system(size: 48, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
                    .tracking(8)
            }

            // Share button
            Button(action: { showShareSheet = true }) {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Invite Friends")
                }
                .font(.subheadline)
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.gray.opacity(0.3))
                .cornerRadius(8)
            }

            // Player list
            VStack(spacing: 4) {
                Text("Players (\(wsManager.players.count))")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.bottom, 8)

                ForEach(wsManager.players, id: \.id) { player in
                    HStack {
                        Circle()
                            .fill(Color(GameConstants.playerColors[player.colorIndex]))
                            .frame(width: 12, height: 12)
                        Text(player.name)
                            .foregroundColor(Color(GameConstants.playerColors[player.colorIndex]))
                            .font(.body)
                        Spacer()
                        if player.isHost == true {
                            Text("HOST")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.yellow.opacity(0.2))
                                .cornerRadius(4)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 40)

            Spacer()

            // Start / Waiting buttons
            if wsManager.isHost {
                Button(action: { wsManager.startGame() }) {
                    Text("Start Game")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(wsManager.players.count >= 2 ? Color.green : Color.gray)
                        .cornerRadius(12)
                }
                .disabled(wsManager.players.count < 2)
                .padding(.horizontal, 40)
            } else {
                Text("Waiting for host to start...")
                    .foregroundColor(.gray)
                    .font(.subheadline)
            }

            // Leave button
            Button(action: { wsManager.disconnect() }) {
                Text("Leave Room")
                    .font(.subheadline)
                    .foregroundColor(.red)
            }
            .padding(.bottom, 16)

            // Countdown overlay
            if let countdown = wsManager.countdownValue, countdown > 0 {
                Text("\(countdown)")
                    .font(.system(size: 120, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
                    .transition(.scale)
            }

            Spacer()
        }
    }
}

// MARK: - Custom Text Field Style

struct GameTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(12)
            .background(Color.white.opacity(0.1))
            .cornerRadius(8)
            .foregroundColor(.white)
            .font(.body)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
