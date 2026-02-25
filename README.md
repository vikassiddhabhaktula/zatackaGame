# Zatacka Game

Zatacka is a real-time multiplayer snake/trail game where players steer a continuously moving line and try to outlast opponents. The last player alive wins.

## Webapp (active)

The playable version is a browser-based webapp located in `web/`.

### Live deployment

**https://zatackagame.onrender.com**

Hosted on Render (free tier). The server may take ~30 seconds to wake up after a period of inactivity.

### Run locally

```bash
cd web/server
npm install
node index.js
```

Then open **http://localhost:3000** in one or more browser tabs.

### How to play

- Up to **8 players** can join from separate browser tabs or devices on the same server.
- Each player controls a continuously moving line that leaves a trail behind it.
- **Left / Right arrow keys** — turn your line left or right.
- **Space** — activate power (when available).
- Avoid hitting walls, your own trail, or any other player's trail.
- The last player still moving wins the round.

### Architecture

| Path | Purpose |
|------|---------|
| `web/server/index.js` | WebSocket server entry point |
| `web/server/Game.js` | Game loop and round management |
| `web/server/Player.js` | Player state and movement |
| `web/server/CollisionGrid.js` | Pixel-grid collision detection |
| `web/server/Room.js` | Lobby / room management |
| `web/client/` | Static HTML + JS served to the browser |
| `render.yaml` | Render deployment config |

### Deploying to Render

The repo includes a `render.yaml` at the root. To deploy:

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**
2. Connect the GitHub repo — Render auto-detects `render.yaml`
3. Start command: `node index.js` (build: `npm install`)
4. Deploy — a public URL is assigned automatically

---

## C++ implementation (future development)

The `src/`, `include/`, and `main.cpp` files contain an earlier C++ implementation of the game engine, originally targeting a console/GUI frontend. This codebase is kept for reference and as the basis for future native development (e.g., higher-performance server, desktop client, or porting to other platforms).

Key modules:

| File | Purpose |
|------|---------|
| `src/game.cpp` | Core game loop |
| `src/player.cpp` | Player state |
| `src/coordinates_manager.cpp` | Trail/collision logic |
| `src/powers.cpp` | Power-up system |
| `src/multithreading_module.cpp` | Concurrent input handling |
| `src/display_console.cpp` | Console renderer |
| `src/database_manager.cpp` | Persistent scores/settings |

---

## iOS

An iOS SwiftUI client lives in `ios/`. It connects to the same WebSocket server as the web client.

---

## Design

See `zatacka_design.pdf` for the original game design document.
