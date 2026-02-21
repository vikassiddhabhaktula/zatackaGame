import Foundation

struct PlayerState: Identifiable {
    let id: Int
    let name: String
    let colorIndex: Int
    var x: CGFloat = 0
    var y: CGFloat = 0
    var angle: CGFloat = 0
    var alive: Bool = true
    var inGap: Bool = false
    var score: Int = 0
    var power: String?
    var powerActive: Bool = false
    var trailWidth: CGFloat = 3
}
