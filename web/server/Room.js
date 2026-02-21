const Player = require('./Player');
const Game = require('./Game');
const { COLORS } = require('./constants');

class Room {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map();
        this.host = null;
        this.game = null;
        this.state = 'lobby';
        this._nextPlayerId = 0;
        this._usedColors = new Set();
    }

    static generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    addPlayer(ws, name) {
        if (this.players.size >= 8) {
            return null;
        }

        const id = this._nextPlayerId++;

        // Assign the first available color
        let colorIndex = 0;
        for (let i = 0; i < COLORS.length; i++) {
            if (!this._usedColors.has(i)) {
                colorIndex = i;
                break;
            }
        }
        this._usedColors.add(colorIndex);

        const player = new Player(id, name, colorIndex);
        player.ws = ws;
        this.players.set(id, player);

        // First player becomes host
        if (this.players.size === 1) {
            this.host = id;
        }

        return player;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        this._usedColors.delete(player.colorIndex);
        this.players.delete(playerId);

        // If the host left, reassign to the next player
        if (this.host === playerId) {
            const nextPlayer = this.players.values().next().value;
            this.host = nextPlayer ? nextPlayer.id : null;
        }

        // If game is running and player was alive, mark them dead
        if (this.game && player.alive) {
            player.alive = false;
        }

        // Notify remaining players
        this.broadcast({
            type: 'player_left',
            playerId: playerId,
            newHost: this.host,
            players: this.getPlayerList()
        });

        // If game is running and only 0-1 players remain, the tick loop will handle round end
    }

    getPlayerList() {
        const list = [];
        for (const [, player] of this.players) {
            list.push({
                id: player.id,
                name: player.name,
                colorIndex: player.colorIndex,
                isHost: player.id === this.host,
                score: player.score
            });
        }
        return list;
    }

    broadcast(msg, exceptId) {
        const data = typeof msg === 'string' ? msg : JSON.stringify(msg);
        for (const [id, player] of this.players) {
            if (id === exceptId) continue;
            if (player.ws && player.ws.readyState === 1) { // WebSocket.OPEN === 1
                try {
                    player.ws.send(data);
                } catch (e) {
                    // Ignore send errors for disconnected clients
                }
            }
        }
    }

    startGame() {
        if (this.players.size < 2) return;
        this.state = 'playing';

        // Reset all scores
        for (const [, player] of this.players) {
            player.score = 0;
        }

        this.game = new Game(this);
        this.game.start();
    }

    handleInput(playerId, dir) {
        if (!this.game || this.state !== 'playing') return;
        const player = this.players.get(playerId);
        if (player) {
            player.dir = dir;
        }
    }

    handlePower(playerId) {
        if (!this.game || this.state !== 'playing') return;
        const player = this.players.get(playerId);
        if (player && player.alive) {
            player.activatePower();
            this.broadcast({
                type: 'power_activated',
                playerId: playerId,
                power: player.power ? player.power.name : null
            });
        }
    }
}

module.exports = Room;
