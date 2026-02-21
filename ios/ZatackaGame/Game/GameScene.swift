import SpriteKit

class GameScene: SKScene {
    weak var wsManager: WebSocketManager?

    // Trail rendering - one path per player
    private var trailPaths: [Int: CGMutablePath] = [:]
    private var trailNodes: [Int: SKShapeNode] = [:]
    private var headNodes: [Int: SKShapeNode] = [:]
    private var previousPositions: [Int: CGPoint] = [:]
    private var playerColors: [Int: UIColor] = [:]

    // Name labels above scoreboard
    private var nameLabels: [SKLabelNode] = []
    private var scoreLabels: [Int: SKLabelNode] = [:]

    // Countdown
    private var countdownLabel: SKLabelNode?

    // Power indicator
    private var powerLabel: SKLabelNode?

    // Touch tracking for left/right steering
    private var leftTouches: Set<UITouch> = []
    private var rightTouches: Set<UITouch> = []
    private var lastDoubleTapTime: TimeInterval = 0

    // MARK: - Scene Setup

    override func didMove(to view: SKView) {
        backgroundColor = .black
        view.isMultipleTouchEnabled = true

        // Draw field border
        let border = SKShapeNode(rect: CGRect(
            x: 0, y: 0,
            width: GameConstants.fieldWidth,
            height: GameConstants.fieldHeight
        ))
        border.strokeColor = .gray
        border.lineWidth = 2
        border.fillColor = .clear
        addChild(border)

        // Setup countdown label
        let cdLabel = SKLabelNode(fontNamed: "Helvetica-Bold")
        cdLabel.fontSize = 72
        cdLabel.fontColor = .white
        cdLabel.position = CGPoint(
            x: GameConstants.fieldWidth / 2,
            y: GameConstants.fieldHeight / 2
        )
        cdLabel.zPosition = 100
        cdLabel.isHidden = true
        cdLabel.verticalAlignmentMode = .center
        cdLabel.horizontalAlignmentMode = .center
        addChild(cdLabel)
        countdownLabel = cdLabel

        // Power indicator at bottom center
        let pwrLabel = SKLabelNode(fontNamed: "Helvetica")
        pwrLabel.fontSize = 16
        pwrLabel.fontColor = .white
        pwrLabel.position = CGPoint(x: GameConstants.fieldWidth / 2, y: 20)
        pwrLabel.zPosition = 100
        pwrLabel.verticalAlignmentMode = .center
        pwrLabel.horizontalAlignmentMode = .center
        addChild(pwrLabel)
        powerLabel = pwrLabel

        // Cache player colors from the lobby player list
        if let players = wsManager?.players {
            for player in players {
                playerColors[player.id] = GameConstants.playerColors[player.colorIndex]
            }
        }

        // Connect callbacks from WebSocketManager
        wsManager?.onGameState = { [weak self] players in
            DispatchQueue.main.async {
                self?.updateGameState(players)
            }
        }
        wsManager?.onRoundStart = { [weak self] spawns in
            DispatchQueue.main.async {
                self?.startRound(spawns)
            }
        }
        wsManager?.onPlayerDied = { [weak self] playerId, scores in
            DispatchQueue.main.async {
                self?.handlePlayerDied(playerId, scores: scores)
            }
        }
        wsManager?.onRoundEnd = { [weak self] winnerId, scores in
            DispatchQueue.main.async {
                self?.handleRoundEnd(winnerId, scores: scores)
            }
        }
    }

    // MARK: - Round Management

    private func startRound(_ spawns: [SpawnInfo]) {
        // Clear previous trails
        trailNodes.values.forEach { $0.removeFromParent() }
        trailNodes.removeAll()
        trailPaths.removeAll()
        headNodes.values.forEach { $0.removeFromParent() }
        headNodes.removeAll()
        previousPositions.removeAll()

        countdownLabel?.isHidden = true

        // Create trail and head nodes for each spawned player
        for spawn in spawns {
            // Look up color from lobby players list
            let colorIndex = wsManager?.players.first(where: { $0.id == spawn.id })?.colorIndex ?? 0
            let color = GameConstants.playerColors[colorIndex]
            playerColors[spawn.id] = color

            // Initialize trail path
            let path = CGMutablePath()
            path.move(to: CGPoint(x: spawn.x, y: spawn.y))
            trailPaths[spawn.id] = path

            // Trail shape node
            let trailNode = SKShapeNode()
            trailNode.strokeColor = color
            trailNode.lineWidth = GameConstants.trailWidth
            trailNode.lineCap = .round
            trailNode.lineJoin = .round
            trailNode.fillColor = .clear
            trailNode.zPosition = 1
            addChild(trailNode)
            trailNodes[spawn.id] = trailNode

            // Head circle
            let head = SKShapeNode(circleOfRadius: 4)
            head.fillColor = color
            head.strokeColor = .white
            head.lineWidth = 1
            head.position = CGPoint(x: spawn.x, y: spawn.y)
            head.zPosition = 10
            addChild(head)
            headNodes[spawn.id] = head

            previousPositions[spawn.id] = CGPoint(x: spawn.x, y: spawn.y)

            // Show power for local player
            if spawn.id == wsManager?.playerId, let power = spawn.power {
                let displayName = power
                    .replacingOccurrences(of: "_", with: " ")
                    .capitalized
                powerLabel?.text = "Power: \(displayName) (Double-tap)"
                powerLabel?.fontColor = .white
            }
        }

        // Setup scoreboard
        setupScoreboard()
    }

    // MARK: - Game State Updates

    private func updateGameState(_ players: [PlayerStateUpdate]) {
        for player in players {
            let point = CGPoint(x: player.x, y: player.y)

            // Update head position
            headNodes[player.id]?.position = point

            if player.alive {
                headNodes[player.id]?.isHidden = false

                if !player.inGap {
                    // Drawing segment: extend path to new position
                    if previousPositions[player.id] != nil {
                        trailPaths[player.id]?.addLine(to: point)
                    } else {
                        trailPaths[player.id]?.move(to: point)
                    }
                } else {
                    // In gap: move without drawing a line
                    trailPaths[player.id]?.move(to: point)
                }

                // Apply updated path to the shape node
                if let path = trailPaths[player.id] {
                    trailNodes[player.id]?.path = path
                }

                // Update trail width if server says it changed (e.g., power-up)
                if let tw = player.trailWidth {
                    trailNodes[player.id]?.lineWidth = tw
                }

                previousPositions[player.id] = point
            } else {
                // Dead player: hide head
                headNodes[player.id]?.isHidden = true
            }

            // Update scoreboard
            if let score = player.score {
                scoreLabels[player.id]?.text = "\(score)"
            }

            // Power active indicator for local player
            if player.id == wsManager?.playerId {
                if let active = player.powerActive, active {
                    powerLabel?.fontColor = .yellow
                } else {
                    powerLabel?.fontColor = .white
                }
            }
        }
    }

    private func handlePlayerDied(_ playerId: Int, scores: [String: Int]) {
        headNodes[playerId]?.isHidden = true

        // Death flash effect at last known position
        let position = headNodes[playerId]?.position ?? .zero
        let flash = SKShapeNode(circleOfRadius: 20)
        flash.fillColor = .white
        flash.strokeColor = .clear
        flash.alpha = 0.8
        flash.position = position
        flash.zPosition = 50
        addChild(flash)
        flash.run(SKAction.sequence([
            SKAction.group([
                SKAction.fadeOut(withDuration: 0.5),
                SKAction.scale(to: 2.0, duration: 0.5)
            ]),
            SKAction.removeFromParent()
        ]))

        updateScores(scores)
    }

    private func handleRoundEnd(_ winnerId: Int?, scores: [String: Int]) {
        updateScores(scores)

        // Show "Round Over" text briefly
        let label = SKLabelNode(fontNamed: "Helvetica-Bold")
        label.text = "Round Over"
        label.fontSize = 48
        label.fontColor = .white
        label.position = CGPoint(
            x: GameConstants.fieldWidth / 2,
            y: GameConstants.fieldHeight / 2
        )
        label.zPosition = 100
        label.verticalAlignmentMode = .center
        label.horizontalAlignmentMode = .center
        addChild(label)
        label.run(SKAction.sequence([
            SKAction.wait(forDuration: 2.0),
            SKAction.fadeOut(withDuration: 0.5),
            SKAction.removeFromParent()
        ]))
    }

    // MARK: - Scoreboard

    private func setupScoreboard() {
        // Remove old labels
        nameLabels.forEach { $0.removeFromParent() }
        nameLabels.removeAll()
        scoreLabels.values.forEach { $0.removeFromParent() }
        scoreLabels.removeAll()

        guard let players = wsManager?.players else { return }

        for (index, player) in players.enumerated() {
            let color = GameConstants.playerColors[player.colorIndex]
            let yPos = GameConstants.fieldHeight - CGFloat(25 + index * 22)

            // Player name
            let nameLabel = SKLabelNode(fontNamed: "Helvetica-Bold")
            nameLabel.text = player.name
            nameLabel.fontSize = 14
            nameLabel.fontColor = color
            nameLabel.horizontalAlignmentMode = .left
            nameLabel.verticalAlignmentMode = .center
            nameLabel.position = CGPoint(x: 10, y: yPos)
            nameLabel.zPosition = 90
            addChild(nameLabel)
            nameLabels.append(nameLabel)

            // Player score
            let scoreLabel = SKLabelNode(fontNamed: "Helvetica-Bold")
            scoreLabel.text = "0"
            scoreLabel.fontSize = 14
            scoreLabel.fontColor = color
            scoreLabel.horizontalAlignmentMode = .left
            scoreLabel.verticalAlignmentMode = .center
            scoreLabel.position = CGPoint(x: 120, y: yPos)
            scoreLabel.zPosition = 90
            addChild(scoreLabel)
            scoreLabels[player.id] = scoreLabel
        }
    }

    private func updateScores(_ scores: [String: Int]) {
        for (idStr, score) in scores {
            if let id = Int(idStr) {
                scoreLabels[id]?.text = "\(score)"
            }
        }
    }

    // MARK: - Touch Input

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        let now = Date.timeIntervalSinceReferenceDate

        for touch in touches {
            let location = touch.location(in: self)
            let midX = GameConstants.fieldWidth / 2

            // Double-tap activates power
            if touch.tapCount == 2 || (now - lastDoubleTapTime < 0.3 && touches.count >= 2) {
                lastDoubleTapTime = now
                wsManager?.usePower()
                return
            }

            // Left half = turn left, right half = turn right
            if location.x < midX {
                leftTouches.insert(touch)
            } else {
                rightTouches.insert(touch)
            }
        }
        updateInputDirection()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        for touch in touches {
            leftTouches.remove(touch)
            rightTouches.remove(touch)
        }
        updateInputDirection()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchesEnded(touches, with: event)
    }

    private func updateInputDirection() {
        let left = !leftTouches.isEmpty
        let right = !rightTouches.isEmpty

        let dir: Int
        if left && !right {
            dir = -1 // Turn left
        } else if right && !left {
            dir = 1  // Turn right
        } else {
            dir = 0  // Straight (both or neither)
        }

        wsManager?.sendInput(dir: dir)
    }

    // MARK: - Frame Update

    override func update(_ currentTime: TimeInterval) {
        // Show countdown from wsManager
        if let countdown = wsManager?.countdownValue, countdown > 0 {
            countdownLabel?.text = "\(countdown)"
            countdownLabel?.isHidden = false
        }
    }
}
