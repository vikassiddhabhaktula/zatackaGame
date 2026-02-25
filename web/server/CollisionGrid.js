// FRESH_TICKS: own-trail cells younger than this many ticks are ignored during
// self-collision checks.  The single-pixel head check means only one edge case
// requires exclusion: at 45°, the previous tick's 3×3 markLine square includes
// the current head position (diagonal corner, age=1).  FRESH_TICKS=2 skips cells
// with age 0 or 1, covering this case.  Genuine self-crossings (minimum U-turn
// ≈63 ticks at TURN_RATE=0.05 rad/tick) always have age ≥63 and are always fatal.
const FRESH_TICKS = 2;

class CollisionGrid {
    constructor(width, height) {
        this.width  = width;
        this.height = height;
        this.grid   = new Uint8Array(width * height);   // playerId+1, 0=empty
        this.age    = new Uint32Array(width * height);  // tick when cell was marked
        this.tick   = 0;
    }

    // Call once per game tick before any markLine / checkCollision calls.
    advanceTick() {
        this.tick++;
    }

    clear() {
        this.grid.fill(0);
        // age values for empty cells are irrelevant; reset tick so age deltas
        // are correct from the first tick of the new round.
        this.tick = 0;
    }

    clearPlayer(playerId) {
        const storedId = playerId + 1;
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i] === storedId) {
                this.grid[i] = 0;
            }
        }
    }

    get(x, y) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
            return -1;
        }
        return this.grid[iy * this.width + ix];
    }

    checkCollision(x, y, radius, selfId) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const halfRadius = Math.ceil(radius / 2);

        // Wall collision
        if (ix - halfRadius < 0 || ix + halfRadius >= this.width ||
            iy - halfRadius < 0 || iy + halfRadius >= this.height) {
            return true;
        }

        // Single-pixel point check: the head occupies exactly one grid cell.
        // markLine uses halfWidth=1 (3×3 squares) so trail is wide enough that
        // the head can never skip over it at SPEED=1.8 px/tick.
        const selfStored = selfId + 1;
        const cellIdx = iy * this.width + ix;
        const cell = this.grid[cellIdx];
        if (cell !== 0) {
            if (cell === selfStored) {
                // Own trail: only fatal once old enough to be a genuine crossing.
                if (this.tick - this.age[cellIdx] >= FRESH_TICKS) return true;
            } else {
                // Another player's trail: always fatal.
                return true;
            }
        }

        return false;
    }

    markLine(x1, y1, x2, y2, playerId, width) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist  = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(Math.ceil(dist), 1);
        const halfWidth = Math.floor(width / 2);

        for (let i = 0; i <= steps; i++) {
            const t  = steps === 0 ? 0 : i / steps;
            const px = Math.round(x1 + dx * t);
            const py = Math.round(y1 + dy * t);

            for (let wy = -halfWidth; wy <= halfWidth; wy++) {
                for (let wx = -halfWidth; wx <= halfWidth; wx++) {
                    const nx = px + wx;
                    const ny = py + wy;
                    if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                        continue;
                    }
                    const cellIdx = ny * this.width + nx;
                    this.grid[cellIdx] = playerId + 1;
                    this.age[cellIdx]  = this.tick;   // stamp when this cell was placed
                }
            }
        }
    }
}

module.exports = CollisionGrid;
