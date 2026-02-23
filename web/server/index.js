const { WebSocketServer } = require('ws');
const http = require('http');
const fs   = require('fs');
const path = require('path');
const Room = require('./Room');

const PORT       = process.env.PORT || 3000;
const rooms      = new Map();
const CLIENT_DIR = path.join(__dirname, '../client');
const MIME       = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
};

// HTTP server — serves web/client/ as static files
const server = http.createServer((req, res) => {
  // Only allow simple file paths (no traversal)
  const safePath = req.url.replace(/\.\./g, '').split('?')[0];
  const filePath = path.join(CLIENT_DIR, safePath === '/' ? 'index.html' : safePath);
  const ext      = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

// WebSocket server attaches to the same HTTP server
const wss = new WebSocketServer({ server });
server.listen(PORT, () => console.log(`Zatacka server running on port ${PORT}`));

wss.on('connection', (ws) => {
    let currentRoom = null;
    let currentPlayer = null;

    ws.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            return;
        }

        switch (msg.type) {
            case 'create_room': {
                let code;
                do {
                    code = Room.generateCode();
                } while (rooms.has(code));
                const room = new Room(code);
                rooms.set(code, room);
                currentRoom = room;
                currentPlayer = room.addPlayer(ws, msg.name || 'Player');
                ws.send(JSON.stringify({
                    type: 'room_created',
                    roomId: code,
                    playerId: currentPlayer.id,
                    color: currentPlayer.colorIndex
                }));
                break;
            }
            case 'join_room': {
                const room = rooms.get(msg.roomId?.toUpperCase());
                if (!room || room.state !== 'lobby') {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room not found or game in progress' }));
                    return;
                }
                if (room.players.size >= 8) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
                    return;
                }
                currentRoom = room;
                currentPlayer = room.addPlayer(ws, msg.name || 'Player');
                ws.send(JSON.stringify({
                    type: 'room_joined',
                    roomId: room.roomId,
                    playerId: currentPlayer.id,
                    color: currentPlayer.colorIndex,
                    players: room.getPlayerList()
                }));
                room.broadcast({
                    type: 'player_joined',
                    player: { id: currentPlayer.id, name: currentPlayer.name, colorIndex: currentPlayer.colorIndex },
                    players: room.getPlayerList()
                }, currentPlayer.id);
                break;
            }
            case 'start_game': {
                if (currentRoom && currentPlayer && currentRoom.host === currentPlayer.id) {
                    if (currentRoom.players.size >= 2) {
                        currentRoom.startGame();
                    }
                }
                break;
            }
            case 'input': {
                if (currentRoom && currentPlayer) {
                    currentRoom.handleInput(currentPlayer.id, msg.dir);
                }
                break;
            }
            case 'use_power': {
                if (currentRoom && currentPlayer) {
                    currentRoom.handlePower(currentPlayer.id);
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        if (currentRoom && currentPlayer) {
            currentRoom.removePlayer(currentPlayer.id);
            if (currentRoom.players.size === 0) {
                if (currentRoom.game) {
                    currentRoom.game.stop();
                }
                rooms.delete(currentRoom.roomId);
            }
        }
    });
});
