const WebSocket = require('ws');

const URL = 'ws://localhost:3000';
let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) {
        passed++;
        console.log(`  PASS: ${msg}`);
    } else {
        failed++;
        console.log(`  FAIL: ${msg}`);
    }
}

function send(ws, msg) {
    ws.send(JSON.stringify(msg));
}

function waitForMessage(ws, type, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
        const handler = (data) => {
            const msg = JSON.parse(data);
            if (msg.type === type) {
                clearTimeout(timer);
                ws.removeListener('message', handler);
                resolve(msg);
            }
        };
        ws.on('message', handler);
    });
}

function collectMessages(ws, type, count, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const msgs = [];
        const timer = setTimeout(() => {
            ws.removeListener('message', handler);
            resolve(msgs); // resolve with what we have
        }, timeout);
        const handler = (data) => {
            const msg = JSON.parse(data);
            if (msg.type === type) {
                msgs.push(msg);
                if (msgs.length >= count) {
                    clearTimeout(timer);
                    ws.removeListener('message', handler);
                    resolve(msgs);
                }
            }
        };
        ws.on('message', handler);
    });
}

function connect() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(URL);
        ws.on('open', () => resolve(ws));
        ws.on('error', reject);
    });
}

async function runTests() {
    console.log('\n=== Test 1: Create Room ===');
    {
        const ws = await connect();
        send(ws, { type: 'create_room', name: 'Alice' });
        const msg = await waitForMessage(ws, 'room_created');
        assert(msg.roomId && msg.roomId.length === 4, `Room code is 4 chars: "${msg.roomId}"`);
        assert(typeof msg.playerId === 'number', `Player ID assigned: ${msg.playerId}`);
        assert(typeof msg.color === 'number', `Color index assigned: ${msg.color}`);
        ws.close();
    }

    console.log('\n=== Test 2: Join Room ===');
    {
        const host = await connect();
        send(host, { type: 'create_room', name: 'Alice' });
        const created = await waitForMessage(host, 'room_created');
        const roomId = created.roomId;

        const joiner = await connect();
        const joinedPromise = waitForMessage(joiner, 'room_joined');
        const notifyPromise = waitForMessage(host, 'player_joined');

        send(joiner, { type: 'join_room', roomId, name: 'Bob' });

        const joined = await joinedPromise;
        assert(joined.roomId === roomId, `Joiner sees correct room: ${joined.roomId}`);
        assert(joined.players.length === 2, `Joiner sees 2 players`);
        assert(joined.playerId !== created.playerId, `Joiner gets different ID`);
        assert(joined.color !== created.color, `Joiner gets different color`);

        const notify = await notifyPromise;
        assert(notify.player.name === 'Bob', `Host notified of Bob joining`);
        assert(notify.players.length === 2, `Host sees 2 players`);

        host.close();
        joiner.close();
    }

    console.log('\n=== Test 3: Join Invalid Room ===');
    {
        const ws = await connect();
        send(ws, { type: 'join_room', roomId: 'ZZZZ', name: 'Eve' });
        const msg = await waitForMessage(ws, 'error');
        assert(msg.message.includes('not found'), `Error for invalid room: "${msg.message}"`);
        ws.close();
    }

    console.log('\n=== Test 4: Start Game + Countdown + Round Start ===');
    {
        const host = await connect();
        send(host, { type: 'create_room', name: 'Alice' });
        const created = await waitForMessage(host, 'room_created');

        const joiner = await connect();
        send(joiner, { type: 'join_room', roomId: created.roomId, name: 'Bob' });
        await waitForMessage(joiner, 'room_joined');
        await waitForMessage(host, 'player_joined');

        // Collect countdown messages on host
        const countdownPromise = collectMessages(host, 'countdown', 3, 5000);
        const roundStartPromise = waitForMessage(host, 'round_start', 6000);

        send(host, { type: 'start_game' });

        const countdowns = await countdownPromise;
        assert(countdowns.length >= 1, `Received ${countdowns.length} countdown message(s)`);
        const hasSeconds = countdowns.every(c => typeof c.seconds === 'number');
        assert(hasSeconds, `Countdown messages have 'seconds' field`);
        if (countdowns.length >= 2) {
            assert(countdowns[0].seconds > countdowns[1].seconds, `Countdown decreases: ${countdowns.map(c=>c.seconds).join(',')}`);
        }

        const roundStart = await roundStartPromise;
        assert(Array.isArray(roundStart.spawns), `round_start has spawns array`);
        assert(roundStart.spawns.length === 2, `2 players spawned`);

        const spawn = roundStart.spawns[0];
        assert(typeof spawn.x === 'number', `Spawn has x coordinate`);
        assert(typeof spawn.y === 'number', `Spawn has y coordinate`);
        assert(typeof spawn.angle === 'number', `Spawn has angle`);
        assert(spawn.x >= 50 && spawn.x <= 750, `Spawn x within margins: ${spawn.x.toFixed(1)}`);
        assert(spawn.y >= 50 && spawn.y <= 550, `Spawn y within margins: ${spawn.y.toFixed(1)}`);
        assert(typeof spawn.power === 'string', `Spawn has power: "${spawn.power}"`);

        // Wait for game_state ticks
        const ticks = await collectMessages(host, 'game_state', 5, 2000);
        assert(ticks.length >= 3, `Received ${ticks.length} game_state ticks (expect 3+)`);
        if (ticks.length > 0) {
            const tick = ticks[0];
            assert(Array.isArray(tick.players), `game_state has players array`);
            assert(tick.players.length === 2, `game_state has 2 players`);
            const p = tick.players[0];
            assert(typeof p.x === 'number', `Tick player has x`);
            assert(typeof p.y === 'number', `Tick player has y`);
            assert(typeof p.alive === 'boolean', `Tick player has alive`);
            assert(typeof p.inGap === 'boolean', `Tick player has inGap`);
        }

        host.close();
        joiner.close();
    }

    console.log('\n=== Test 5: Input Direction ===');
    {
        const host = await connect();
        send(host, { type: 'create_room', name: 'Alice' });
        const created = await waitForMessage(host, 'room_created');

        const joiner = await connect();
        send(joiner, { type: 'join_room', roomId: created.roomId, name: 'Bob' });
        await waitForMessage(joiner, 'room_joined');
        await waitForMessage(host, 'player_joined');

        send(host, { type: 'start_game' });
        await waitForMessage(host, 'round_start', 6000);

        // Send turn left
        send(host, { type: 'input', dir: -1 });
        await new Promise(r => setTimeout(r, 200));

        // Send turn right
        send(host, { type: 'input', dir: 1 });
        await new Promise(r => setTimeout(r, 200));

        // Send straight
        send(host, { type: 'input', dir: 0 });

        // Get a tick to verify player is still moving
        const ticks = await collectMessages(host, 'game_state', 1, 1000);
        assert(ticks.length >= 1, `Still receiving ticks after input changes`);

        host.close();
        joiner.close();
    }

    console.log('\n=== Test 6: Power Activation ===');
    {
        const host = await connect();
        send(host, { type: 'create_room', name: 'Alice' });
        const created = await waitForMessage(host, 'room_created');

        const joiner = await connect();
        send(joiner, { type: 'join_room', roomId: created.roomId, name: 'Bob' });
        await waitForMessage(joiner, 'room_joined');
        await waitForMessage(host, 'player_joined');

        send(host, { type: 'start_game' });
        await waitForMessage(host, 'round_start', 6000);

        // Activate power
        send(host, { type: 'use_power' });
        const powerMsg = await waitForMessage(host, 'power_activated', 2000);
        assert(powerMsg.playerId === created.playerId, `Power activated for correct player`);
        assert(typeof powerMsg.power === 'string', `Power name: "${powerMsg.power}"`);

        host.close();
        joiner.close();
    }

    console.log('\n=== Test 7: Player Disconnect ===');
    {
        const host = await connect();
        send(host, { type: 'create_room', name: 'Alice' });
        const created = await waitForMessage(host, 'room_created');

        const joiner = await connect();
        send(joiner, { type: 'join_room', roomId: created.roomId, name: 'Bob' });
        await waitForMessage(joiner, 'room_joined');
        await waitForMessage(host, 'player_joined');

        const leftPromise = waitForMessage(host, 'player_left');
        joiner.close();
        const leftMsg = await leftPromise;
        assert(leftMsg.players.length === 1, `Host sees 1 player after disconnect`);
        assert(leftMsg.players[0].name === 'Alice', `Remaining player is Alice`);

        host.close();
    }

    console.log('\n=== Test 8: Collision Detection (Wall) ===');
    {
        // Test CollisionGrid directly
        const CollisionGrid = require('./CollisionGrid');
        const grid = new CollisionGrid(800, 600);

        // Wall collision
        assert(grid.checkCollision(-1, 300, 3, 0, false) === true, 'Left wall collision detected');
        assert(grid.checkCollision(800, 300, 3, 0, false) === true, 'Right wall collision detected');
        assert(grid.checkCollision(400, -1, 3, 0, false) === true, 'Top wall collision detected');
        assert(grid.checkCollision(400, 600, 3, 0, false) === true, 'Bottom wall collision detected');
        assert(grid.checkCollision(400, 300, 3, 0, false) === false, 'Center is clear');

        // Trail collision
        grid.markLine(100, 100, 200, 100, 1, 3);
        assert(grid.checkCollision(150, 100, 3, 0, false) === true, 'Hit player 1 trail');
        assert(grid.checkCollision(150, 100, 3, 1, true) === false, 'Self trail ok with grace');
        assert(grid.checkCollision(150, 100, 3, 1, false) === true, 'Self trail kills without grace');
        assert(grid.checkCollision(300, 300, 3, 0, false) === false, 'Empty area is clear');

        // Clear player
        grid.clearPlayer(1);
        assert(grid.checkCollision(150, 100, 3, 0, false) === false, 'Trail cleared after clearPlayer');
    }

    console.log('\n=== Test 9: Room Max Players ===');
    {
        const host = await connect();
        send(host, { type: 'create_room', name: 'P1' });
        const created = await waitForMessage(host, 'room_created');
        const roomId = created.roomId;

        const clients = [host];
        // Add 7 more players (total 8)
        for (let i = 2; i <= 8; i++) {
            const c = await connect();
            send(c, { type: 'join_room', roomId, name: `P${i}` });
            await waitForMessage(c, 'room_joined');
            clients.push(c);
        }
        assert(true, '8 players joined successfully');

        // 9th should fail
        const extra = await connect();
        send(extra, { type: 'join_room', roomId, name: 'P9' });
        const err = await waitForMessage(extra, 'error');
        assert(err.message.includes('full'), `Room full error: "${err.message}"`);

        clients.forEach(c => c.close());
        extra.close();
    }

    // Summary
    console.log(`\n${'='.repeat(40)}`);
    console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log(`${'='.repeat(40)}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
