// FRESH_TICKS: own-trail cells placed within this many ticks are ignored during
// self-collision checks.  With SPEED=1.8 px/tick and halfRadius=ceil(3/2)=2 px,
// the head always overlaps the last ~2 ticks of its own trail; 4 ticks gives a
// 7.2 px exclusion zone — safely beyond halfRadius while still detecting genuine
// self-crossings (minimum U-turn takes ~63 ticks at TURN_RATE=0.05 rad/tick).
const FRESH_TICKS = 4;

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

        const selfStored = selfId + 1;
        for (let dy = -halfRadius; dy <= halfRadius; dy++) {
            for (let dx = -halfRadius; dx <= halfRadius; dx++) {
                const cx = ix + dx;
                const cy = iy + dy;
                if (cx < 0 || cx >= this.width || cy < 0 || cy >= this.height) {
                    continue;
                }
                const cellIdx = cy * this.width + cx;
                const cell = this.grid[cellIdx];
                if (cell === 0) continue;

                if (cell === selfStored) {
                    // Own trail: only fatal once it's old enough that the head
                    // has genuinely crossed back over it.
                    if (this.tick - this.age[cellIdx] >= FRESH_TICKS) {
                        return true;
                    }
                } else {
                    // Another player's trail: always fatal.
                    return true;
                }
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
