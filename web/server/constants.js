const TICK_RATE = 60;
const SPEED = 1.8;
const TURN_RATE = 0.05;
const TRAIL_WIDTH = 3;
const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 600;
const GAP_INTERVAL_MIN = 90;
const GAP_INTERVAL_MAX = 200;
const GAP_DURATION_MIN = 6;
const GAP_DURATION_MAX = 12;
const GRACE_PERIOD = 30;
const COUNTDOWN_SECONDS = 3;

function POINTS_TO_WIN(numPlayers) {
    return (numPlayers - 1) * 5;
}

const COLORS = [
    '#FF0000',
    '#00FF00',
    '#0066FF',
    '#FF00FF',
    '#FFFF00',
    '#FFFFFF',
    '#FF8800',
    '#00FFFF'
];

const COLOR_NAMES = [
    'Red',
    'Green',
    'Blue',
    'Magenta',
    'Yellow',
    'White',
    'Orange',
    'Cyan'
];

const POWERS = [
    { name: 'speed_boost', duration: 180, description: 'Move faster' },
    { name: 'slow_others', duration: 180, description: 'Slow down enemies' },
    { name: 'thin_trail', duration: 300, description: 'Thinner trail' },
    { name: 'right_angle', duration: 300, description: '90\u00B0 turns' },
    { name: 'eraser', duration: 1, description: 'Clear your trail' }
];

module.exports = {
    TICK_RATE,
    SPEED,
    TURN_RATE,
    TRAIL_WIDTH,
    FIELD_WIDTH,
    FIELD_HEIGHT,
    GAP_INTERVAL_MIN,
    GAP_INTERVAL_MAX,
    GAP_DURATION_MIN,
    GAP_DURATION_MAX,
    GRACE_PERIOD,
    COUNTDOWN_SECONDS,
    POINTS_TO_WIN,
    COLORS,
    COLOR_NAMES,
    POWERS
};
