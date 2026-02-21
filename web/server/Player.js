const {
    SPEED,
    TURN_RATE,
    TRAIL_WIDTH,
    GAP_INTERVAL_MIN,
    GAP_INTERVAL_MAX,
    GAP_DURATION_MIN,
    GAP_DURATION_MAX,
    GRACE_PERIOD,
    POWERS
} = require('./constants');

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Player {
    constructor(id, name, colorIndex) {
        this.id = id;
        this.name = name;
        this.colorIndex = colorIndex;
        this.ws = null;

        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.alive = true;
        this.score = 0;
        this.dir = 0; // -1 left, 0 straight, 1 right
        this.tickCount = 0;

        this.gapInterval = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
        this.gapTimer = 0;
        this.inGap = false;
        this.gapDuration = 0;

        this.gracePeriod = GRACE_PERIOD;

        this.power = null;
        this.powerActive = false;
        this.powerTimer = 0;

        this.speedMultiplier = 1.0;
        this.turnRateMultiplier = 1.0;
        this.trailWidthMultiplier = 1.0;

        // Track right_angle single-press snapping
        this._rightAngleSnapped = false;
    }

    spawn(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.alive = true;
        this.dir = 0;
        this.tickCount = 0;

        this.gapInterval = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
        this.gapTimer = 0;
        this.inGap = false;
        this.gapDuration = 0;

        this.gracePeriod = GRACE_PERIOD;

        this.powerActive = false;
        this.powerTimer = 0;
        this.speedMultiplier = 1.0;
        this.turnRateMultiplier = 1.0;
        this.trailWidthMultiplier = 1.0;
        this._rightAngleSnapped = false;

        // Assign a random power
        this.power = POWERS[Math.floor(Math.random() * POWERS.length)];
    }

    update() {
        if (!this.alive) return;

        // Decrement grace period
        if (this.gracePeriod > 0) {
            this.gracePeriod--;
        }

        // Handle gap logic
        this.gapTimer++;
        if (!this.inGap) {
            if (this.gapTimer >= this.gapInterval) {
                this.inGap = true;
                this.gapTimer = 0;
                this.gapDuration = randInt(GAP_DURATION_MIN, GAP_DURATION_MAX);
            }
        } else {
            if (this.gapTimer >= this.gapDuration) {
                this.inGap = false;
                this.gapTimer = 0;
                this.gapInterval = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
            }
        }

        // Handle active power timer
        if (this.powerActive) {
            this.powerTimer--;
            if (this.powerTimer <= 0) {
                this.deactivatePower();
            }
        }

        // Calculate effective speed and turn rate
        const effectiveSpeed = SPEED * this.speedMultiplier;
        const effectiveTurnRate = TURN_RATE * this.turnRateMultiplier;

        // Handle turning
        if (this.dir !== 0) {
            if (this.powerActive && this.power && this.power.name === 'right_angle') {
                // Snap angle by PI/2 in the turn direction, only once per press
                if (!this._rightAngleSnapped) {
                    this.angle += (Math.PI / 2) * this.dir;
                    this._rightAngleSnapped = true;
                }
            } else {
                this.angle += effectiveTurnRate * this.dir;
            }
        } else {
            // Reset snap flag when key is released
            this._rightAngleSnapped = false;
        }

        // Move forward
        this.x += Math.cos(this.angle) * effectiveSpeed;
        this.y += Math.sin(this.angle) * effectiveSpeed;

        this.tickCount++;
    }

    activatePower() {
        if (!this.power || this.powerActive) return;

        this.powerActive = true;
        this.powerTimer = this.power.duration;

        switch (this.power.name) {
            case 'speed_boost':
                this.speedMultiplier = 1.8;
                break;
            case 'slow_others':
                // Handled in Game.js - applies to other players
                break;
            case 'thin_trail':
                this.trailWidthMultiplier = 0.3;
                break;
            case 'right_angle':
                // Turning is handled via snap logic in update()
                this.turnRateMultiplier = 1.0;
                break;
            case 'eraser':
                // Just marks active; Game.js handles clearing the trail from the grid
                break;
        }
    }

    deactivatePower() {
        this.speedMultiplier = 1.0;
        this.turnRateMultiplier = 1.0;
        this.trailWidthMultiplier = 1.0;
        this.powerActive = false;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            angle: this.angle,
            alive: this.alive,
            inGap: this.inGap,
            score: this.score,
            colorIndex: this.colorIndex,
            power: this.power ? this.power.name : null,
            powerActive: this.powerActive,
            trailWidth: TRAIL_WIDTH * this.trailWidthMultiplier
        };
    }
}

module.exports = Player;
