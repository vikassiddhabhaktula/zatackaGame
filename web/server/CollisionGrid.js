class CollisionGrid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = new Uint8Array(width * height);
    }

    clear() {
        this.grid.fill(0);
    }

    clearPlayer(playerId) {
        // Player IDs are stored as playerId + 1 in the grid (0 means empty)
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
            return -1; // Out of bounds
        }
        return this.grid[iy * this.width + ix];
    }

    set(x, y, playerId) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
            return;
        }
        // Store as playerId + 1 so that 0 means empty
        this.grid[iy * this.width + ix] = playerId + 1;
    }

    checkCollision(x, y, radius, selfId, graceActive) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const halfRadius = Math.ceil(radius / 2);

        // Wall collision check
        if (ix - halfRadius < 0 || ix + halfRadius >= this.width ||
            iy - halfRadius < 0 || iy + halfRadius >= this.height) {
            return true;
        }

        // Trail collision check within the radius area
        const selfStored = selfId + 1;
        for (let dy = -halfRadius; dy <= halfRadius; dy++) {
            for (let dx = -halfRadius; dx <= halfRadius; dx++) {
                const cx = ix + dx;
                const cy = iy + dy;
                if (cx < 0 || cx >= this.width || cy < 0 || cy >= this.height) {
                    continue;
                }
                const cell = this.grid[cy * this.width + cx];
                if (cell !== 0) {
                    // Hit something
                    if (cell !== selfStored || !graceActive) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    markLine(x1, y1, x2, y2, playerId, width) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(Math.ceil(dist), 1);
        const halfWidth = Math.floor(width / 2);

        for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 0 : i / steps;
            const px = Math.round(x1 + dx * t);
            const py = Math.round(y1 + dy * t);

            // Mark a square of the given width centered on the point
            for (let wy = -halfWidth; wy <= halfWidth; wy++) {
                for (let wx = -halfWidth; wx <= halfWidth; wx++) {
                    this.set(px + wx, py + wy, playerId);
                }
            }
        }
    }
}

module.exports = CollisionGrid;
