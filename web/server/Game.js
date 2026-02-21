const CollisionGrid = require('./CollisionGrid');
const {
    TICK_RATE,
    TRAIL_WIDTH,
    FIELD_WIDTH,
    FIELD_HEIGHT,
    COUNTDOWN_SECONDS,
    POINTS_TO_WIN
} = require('./constants');

class Game {
    constructor(room) {
        this.room = room;
        this.players = room.players;
        this.grid = new CollisionGrid(FIELD_WIDTH, FIELD_HEIGHT);
        this.roundNumber = 0;
        this.interval = null;
        this.roundActive = false;
    }

    start() {
        this.startNewRound();
    }

    startNewRound() {
        this.roundNumber++;
        this.roundActive = false;
        this.grid.clear();

        // Spawn all players at random positions
        const spawnPositions = this._generateSpawnPositions();
        let i = 0;
        for (const [, player] of this.players) {
            const pos = spawnPositions[i];
            player.spawn(pos.x, pos.y, pos.angle);
            i++;
        }

        // Build spawn data for clients as an array
        const spawns = [];
        for (const [, player] of this.players) {
            const pj = player.toJSON();
            spawns.push({
                id: pj.id,
                x: pj.x,
                y: pj.y,
                angle: pj.angle,
                power: pj.power,
                colorIndex: pj.colorIndex
            });
        }

        // Broadcast countdown (3, 2, 1)
        for (let s = COUNTDOWN_SECONDS; s >= 1; s--) {
            const sec = s;
            setTimeout(() => {
                this.room.broadcast({
                    type: 'countdown',
                    seconds: sec
                });
            }, (COUNTDOWN_SECONDS - sec) * 1000);
        }

        // After countdown, start the round
        setTimeout(() => {
            this.room.broadcast({
                type: 'round_start',
                spawns: spawns
            });

            this.roundActive = true;
            this.interval = setInterval(() => {
                this.tick();
            }, 1000 / TICK_RATE);
        }, COUNTDOWN_SECONDS * 1000);
    }

    tick() {
        if (!this.roundActive) return;

        const trailUpdates = [];
        const prevPositions = new Map();

        // Store previous positions for trail marking
        for (const [, player] of this.players) {
            if (player.alive) {
                prevPositions.set(player.id, { x: player.x, y: player.y });
            }
        }

        // Handle slow_others power effect
        for (const [, player] of this.players) {
            if (player.alive && player.powerActive && player.power && player.power.name === 'slow_others') {
                for (const [, other] of this.players) {
                    if (other.id !== player.id && other.alive) {
                        other.speedMultiplier = 0.5;
                    }
                }
            }
        }

        // Handle eraser power
        for (const [, player] of this.players) {
            if (player.alive && player.powerActive && player.power && player.power.name === 'eraser') {
                this.grid.clearPlayer(player.id);
                player.deactivatePower();
                this.room.broadcast({
                    type: 'eraser_used',
                    playerId: player.id
                });
            }
        }

        // Update all players
        for (const [, player] of this.players) {
            if (!player.alive) continue;

            player.update();

            // Mark trail on grid if not in gap and grace period is over
            if (!player.inGap && player.gracePeriod <= 0) {
                const prev = prevPositions.get(player.id);
                if (prev) {
                    const effectiveWidth = Math.round(TRAIL_WIDTH * player.trailWidthMultiplier);
                    this.grid.markLine(prev.x, prev.y, player.x, player.y, player.id, effectiveWidth);
                }
            }

            // Check collision (skip during grace period)
            if (player.gracePeriod <= 0) {
                const effectiveWidth = Math.round(TRAIL_WIDTH * player.trailWidthMultiplier);
                if (this.checkCollision(player, effectiveWidth)) {
                    player.alive = false;

                    const scores = {};
                    for (const [, p] of this.players) {
                        scores[p.id] = p.score;
                    }

                    this.room.broadcast({
                        type: 'player_died',
                        playerId: player.id,
                        x: player.x,
                        y: player.y,
                        scores: scores
                    });
                }
            }

            // Collect state update for this tick
            trailUpdates.push({
                id: player.id,
                x: player.x,
                y: player.y,
                angle: player.angle,
                inGap: player.inGap,
                trailWidth: TRAIL_WIDTH * player.trailWidthMultiplier,
                powerActive: player.powerActive,
                alive: player.alive,
                score: player.score
            });
        }

        // Send game state update
        this.room.broadcast({
            type: 'game_state',
            players: trailUpdates
        });

        // Reset slow_others effect for next tick (will be reapplied if still active)
        for (const [, player] of this.players) {
            if (player.alive && player.speedMultiplier === 0.5) {
                // Check if any player is actively slowing others
                let beingSlowed = false;
                for (const [, other] of this.players) {
                    if (other.id !== player.id && other.alive && other.powerActive &&
                        other.power && other.power.name === 'slow_others') {
                        beingSlowed = true;
                        break;
                    }
                }
                if (!beingSlowed) {
                    player.speedMultiplier = 1.0;
                }
            }
        }

        // Check if round is over (1 or fewer alive)
        const alivePlayers = [];
        for (const [, player] of this.players) {
            if (player.alive) {
                alivePlayers.push(player);
            }
        }

        if (alivePlayers.length <= 1 && this.players.size >= 2) {
            this.roundActive = false;
            clearInterval(this.interval);
            this.interval = null;

            // Award point to the survivor
            if (alivePlayers.length === 1) {
                alivePlayers[0].score++;
            }

            const scores = {};
            for (const [, p] of this.players) {
                scores[p.id] = p.score;
            }

            const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;

            this.room.broadcast({
                type: 'round_end',
                roundNumber: this.roundNumber,
                winnerId: winnerId,
                scores: scores
            });

            // Check if game is over
            const pointsNeeded = POINTS_TO_WIN(this.players.size);
            let gameWinner = null;
            for (const [, player] of this.players) {
                if (player.score >= pointsNeeded) {
                    gameWinner = player;
                    break;
                }
            }

            if (gameWinner) {
                this.room.broadcast({
                    type: 'game_over',
                    winnerId: gameWinner.id,
                    winnerName: gameWinner.name,
                    scores: scores
                });
                this.room.state = 'lobby';
                this.room.game = null;
            } else {
                // Start new round after a delay
                setTimeout(() => {
                    if (this.room.game === this) {
                        this.startNewRound();
                    }
                }, 2000);
            }
        }
    }

    checkCollision(player, trailWidth) {
        const graceActive = player.gracePeriod > 0;
        return this.grid.checkCollision(
            player.x,
            player.y,
            trailWidth,
            player.id,
            graceActive
        );
    }

    _generateSpawnPositions() {
        const positions = [];
        const margin = 50;
        const minDistance = 100;
        const playerCount = this.players.size;

        for (let i = 0; i < playerCount; i++) {
            let attempts = 0;
            let x, y, angle;

            while (attempts < 100) {
                x = margin + Math.random() * (FIELD_WIDTH - 2 * margin);
                y = margin + Math.random() * (FIELD_HEIGHT - 2 * margin);
                angle = Math.random() * Math.PI * 2;

                let tooClose = false;
                for (const pos of positions) {
                    const dx = pos.x - x;
                    const dy = pos.y - y;
                    if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose) break;
                attempts++;
            }

            positions.push({ x, y, angle });
        }

        return positions;
    }

    stop() {
        this.roundActive = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

module.exports = Game;
