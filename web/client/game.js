'use strict';

// ==========================================
// Constants (mirror server constants.js)
// ==========================================
const COLORS = [
  '#FF0000', '#00FF00', '#0066FF', '#FF00FF',
  '#FFFF00', '#FFFFFF', '#FF8800', '#00FFFF'
];

const POWER_DESCRIPTIONS = {
  speed_boost: 'Speed Boost',
  slow_others: 'Slow Others',
  thin_trail:  'Thin Trail',
  right_angle: '90° Turns',
  eraser:      'Eraser',
};

const FIELD_W = 800;
const FIELD_H = 600;
const DEATH_MARKER_TTL = 90; // frames (~1.5s at 60fps)

// ==========================================
// State — single source of truth
// ==========================================
const state = {
  ws:             null,
  myPlayerId:     null,
  isHost:         false,
  roomId:         null,
  pendingName:    '',

  // { [id]: {id, name, colorIndex, isHost, score, alive, power, powerActive} }
  players:        {},

  phase:          'lobby',  // 'lobby' | 'countdown' | 'playing' | 'round_end' | 'game_over'
  roundNumber:    0,

  // { [id]: [{x, y, inGap, trailWidth}] }
  trails:         {},

  // last game_state players array (for head positions)
  snapshot:       null,

  // [{x, y, colorIndex, ttl}]
  deathMarkers:   [],

  // Input
  leftDown:       false,
  rightDown:      false,
  lastPressedSide: null,
  lastSentDir:    0,

  rafId:          null,
};

// ==========================================
// DOM helpers
// ==========================================
const $ = id => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $(`screen-${name}`).classList.add('active');
}

function showOverlay(html, autoHideMs) {
  const ov = $('overlay');
  ov.innerHTML = html;
  ov.style.display = 'flex';
  if (autoHideMs) {
    setTimeout(() => { ov.style.display = 'none'; }, autoHideMs);
  }
}

function hideOverlay() {
  const ov = $('overlay');
  ov.style.display = 'none';
  ov.innerHTML = '';
}

// ==========================================
// WebSocket
// ==========================================
function connect(initialMessage) {
  // Close any existing connection
  if (state.ws) {
    state.ws.onclose = null; // prevent stale handler firing
    state.ws.close();
    state.ws = null;
  }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const WS_URL = `${proto}://${location.host}`;

  const ws = new WebSocket(WS_URL);
  state.ws = ws;

  ws.onopen = () => send(initialMessage);

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleMessage(msg);
  };

  ws.onerror = () => {
    $('lobby-error').textContent = 'Connection error — is the server running?';
  };

  ws.onclose = () => {
    state.ws = null;
  };
}

function send(obj) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(obj));
  }
}

// ==========================================
// Message handler
// ==========================================
function handleMessage(msg) {
  switch (msg.type) {

    case 'room_created': {
      state.myPlayerId = msg.playerId;
      state.isHost     = true;
      state.roomId     = msg.roomId;
      state.players    = {};
      state.players[msg.playerId] = {
        id:          msg.playerId,
        name:        state.pendingName,
        colorIndex:  msg.color,
        isHost:      true,
        score:       0,
        alive:       true,
        power:       null,
        powerActive: false,
      };
      showWaitingRoom();
      break;
    }

    case 'room_joined': {
      state.myPlayerId = msg.playerId;
      state.isHost     = false;
      state.roomId     = msg.roomId;
      state.players    = {};
      for (const p of msg.players) {
        state.players[p.id] = {
          id:          p.id,
          name:        p.name,
          colorIndex:  p.colorIndex,
          isHost:      p.isHost,
          score:       p.score || 0,
          alive:       true,
          power:       null,
          powerActive: false,
        };
      }
      showWaitingRoom();
      break;
    }

    case 'player_joined': {
      const p = msg.player;
      state.players[p.id] = {
        id:          p.id,
        name:        p.name,
        colorIndex:  p.colorIndex,
        isHost:      false,
        score:       0,
        alive:       true,
        power:       null,
        powerActive: false,
      };
      renderPlayerList();
      updateStartButton();
      break;
    }

    case 'player_left': {
      delete state.players[msg.playerId];
      // Promote self to host if indicated
      if (msg.newHost === state.myPlayerId) {
        state.isHost = true;
        $('host-badge').classList.remove('hidden');
      }
      // Update isHost flag for remaining players
      for (const id in state.players) {
        state.players[id].isHost = (Number(id) === msg.newHost);
      }
      renderPlayerList();
      updateStartButton();
      break;
    }

    case 'countdown': {
      if (state.phase !== 'countdown' && state.phase !== 'playing') {
        state.phase = 'countdown';
        showScreen('game');
      }
      showOverlay(`<span class="countdown-num">${msg.seconds}</span>`);
      break;
    }

    case 'round_start': {
      state.phase       = 'playing';
      state.roundNumber++;
      state.trails      = {};
      state.deathMarkers = [];
      state.snapshot    = null;

      // Seed each player's trail from spawn position
      for (const sp of msg.spawns) {
        if (state.players[sp.id]) {
          state.players[sp.id].alive       = true;
          state.players[sp.id].power       = sp.power; // string name or null
          state.players[sp.id].powerActive = false;
          state.players[sp.id].colorIndex  = sp.colorIndex;
        }
        state.trails[sp.id] = [{ x: sp.x, y: sp.y, inGap: false, trailWidth: 3 }];
      }

      $('round-display').textContent = `Round ${state.roundNumber}`;
      updateScoreboard();
      updatePowerDisplay();

      showOverlay('<span class="countdown-num go-text">GO!</span>', 500);

      // Start / restart render loop
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      scheduleFrame();
      break;
    }

    case 'game_state': {
      state.snapshot = msg.players;
      for (const p of msg.players) {
        const player = state.players[p.id];
        if (!player) continue;

        player.alive       = p.alive;
        player.score       = p.score;
        player.powerActive = p.powerActive;

        // Append position to trail only while alive
        if (p.alive) {
          if (!state.trails[p.id]) state.trails[p.id] = [];
          state.trails[p.id].push({
            x:          p.x,
            y:          p.y,
            inGap:      p.inGap,
            trailWidth: p.trailWidth,
          });
        }
      }
      break;
    }

    case 'player_died': {
      const dead = state.players[msg.playerId];
      if (dead) {
        dead.alive = false;
        state.deathMarkers.push({
          x:          msg.x,
          y:          msg.y,
          colorIndex: dead.colorIndex,
          ttl:        DEATH_MARKER_TTL,
        });
      }
      // Update all scores from server
      for (const id in msg.scores) {
        if (state.players[id]) {
          state.players[id].score = msg.scores[id];
        }
      }
      updateScoreboard();
      break;
    }

    case 'power_activated': {
      if (state.players[msg.playerId]) {
        state.players[msg.playerId].powerActive = true;
      }
      updatePowerDisplay();
      break;
    }

    case 'eraser_used': {
      state.trails[msg.playerId] = [];
      break;
    }

    case 'round_end': {
      state.phase = 'round_end';
      // Update scores
      for (const id in msg.scores) {
        if (state.players[id]) {
          state.players[id].score = msg.scores[id];
        }
      }
      updateScoreboard();

      const winner = state.players[msg.winnerId];
      const numPlayers = Object.keys(state.players).length;
      const pointsToWin = (numPlayers - 1) * 5;

      let winnerLine;
      if (winner) {
        winnerLine = `<div class="round-winner" style="color:${COLORS[winner.colorIndex]}">
                        ${escHtml(winner.name)} wins round ${msg.roundNumber}!
                      </div>`;
      } else {
        winnerLine = `<div class="round-winner">Round ${msg.roundNumber} — no survivor</div>`;
      }

      showOverlay(`
        <div class="round-end-overlay">
          ${winnerLine}
          <div class="round-scores">${buildScoreLines(pointsToWin)}</div>
        </div>
      `);
      // Overlay stays until next round_start or game_over
      break;
    }

    case 'game_over': {
      state.phase = 'game_over';
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      hideOverlay();

      // Update scores
      for (const id in msg.scores) {
        if (state.players[id]) {
          state.players[id].score = msg.scores[id];
        }
      }

      // Winner text
      const winner = state.players[msg.winnerId];
      const winnerColor = winner ? COLORS[winner.colorIndex] : '#fff';
      $('winner-text').innerHTML =
        `<span style="color:${winnerColor}">${escHtml(msg.winnerName)}</span> wins!`;

      // Final score table
      const sorted = Object.values(state.players).sort((a, b) => b.score - a.score);
      let tableHtml = '<tr><th>Player</th><th>Score</th></tr>';
      for (const p of sorted) {
        tableHtml += `<tr>
          <td><span class="color-swatch" style="background:${COLORS[p.colorIndex]}"></span>${escHtml(p.name)}</td>
          <td>${p.score} pts</td>
        </tr>`;
      }
      $('final-scores').innerHTML = tableHtml;
      showScreen('gameover');
      break;
    }

    case 'error': {
      $('lobby-error').textContent = msg.message || 'An error occurred.';
      break;
    }
  }
}

// ==========================================
// Lobby UI
// ==========================================
function showWaitingRoom() {
  $('room-waiting').classList.remove('hidden');
  $('room-code-display').textContent = state.roomId;
  if (state.isHost) {
    $('host-badge').classList.remove('hidden');
  } else {
    $('host-badge').classList.add('hidden');
  }
  renderPlayerList();
  updateStartButton();
}

function renderPlayerList() {
  const ul = $('player-list');
  ul.innerHTML = '';
  for (const p of Object.values(state.players)) {
    const li = document.createElement('li');
    li.style.color = COLORS[p.colorIndex];
    li.textContent = p.name + (p.isHost ? ' ♛' : '');
    ul.appendChild(li);
  }
}

function updateStartButton() {
  const btn   = $('btn-start');
  const hint  = $('start-hint');
  const count = Object.keys(state.players).length;
  if (state.isHost) {
    btn.style.display = '';
    btn.disabled      = count < 2;
    hint.style.display = count < 2 ? '' : 'none';
  } else {
    btn.style.display  = 'none';
    hint.style.display = count < 2 ? '' : 'none';
  }
}

// ==========================================
// Scoreboard & sidebar
// ==========================================
function buildScoreLines(pointsToWin) {
  return Object.values(state.players)
    .sort((a, b) => b.score - a.score)
    .map(p => {
      const remaining = Math.max(0, pointsToWin - p.score);
      return `<div class="score-line">
        <span class="color-swatch" style="background:${COLORS[p.colorIndex]}"></span>
        <span class="score-name">${escHtml(p.name)}</span>
        <span class="score-pts">${p.score} pts</span>
        <span class="score-rem">(${remaining} to win)</span>
      </div>`;
    })
    .join('');
}

function updateScoreboard() {
  const numPlayers  = Object.keys(state.players).length;
  const pointsToWin = (numPlayers - 1) * 5;
  $('scoreboard').innerHTML = buildScoreLines(pointsToWin);
}

function updatePowerDisplay() {
  const me = state.players[state.myPlayerId];
  const el = $('power-display');
  if (!me || !me.power) {
    el.innerHTML = '<span style="color:#555">None</span>';
    return;
  }
  const name = POWER_DESCRIPTIONS[me.power] || me.power;
  if (me.powerActive) {
    el.innerHTML = `<span style="color:#FFD700">${escHtml(name)}</span>
                    <div class="power-active-label">● ACTIVE</div>`;
  } else {
    el.innerHTML = `<span>${escHtml(name)}</span>
                    <div style="color:#555;font-size:0.75rem">Press Space</div>`;
  }
}

// ==========================================
// Canvas rendering
// ==========================================
const canvas = $('game-canvas');
const ctx    = canvas.getContext('2d');

function scheduleFrame() {
  state.rafId = requestAnimationFrame(frameCallback);
}

function frameCallback() {
  if (state.phase === 'playing' || state.phase === 'round_end') {
    drawFrame();
    scheduleFrame();
  } else {
    state.rafId = null;
  }
}

function drawFrame() {
  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  // Field border
  ctx.strokeStyle = '#444';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0.5, 0.5, FIELD_W - 1, FIELD_H - 1);

  // Draw trails
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  for (const idStr in state.trails) {
    const id     = Number(idStr);
    const player = state.players[id];
    if (!player) continue;

    const trail = state.trails[idStr];
    const color = COLORS[player.colorIndex];
    ctx.strokeStyle = color;

    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      if (prev.inGap || curr.inGap) continue;

      ctx.lineWidth = curr.trailWidth;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  }

  // Draw heads from latest snapshot
  if (state.snapshot) {
    for (const p of state.snapshot) {
      if (!p.alive) continue;
      const player = state.players[p.id];
      if (!player) continue;
      const color = COLORS[player.colorIndex];

      // Head dot
      ctx.globalAlpha = 1.0;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Power-active ring
      if (p.powerActive) {
        ctx.globalAlpha  = 0.5;
        ctx.strokeStyle  = color;
        ctx.lineWidth    = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Draw death markers (fading X)
  const surviving = [];
  for (const m of state.deathMarkers) {
    m.ttl--;
    if (m.ttl <= 0) continue;
    surviving.push(m);

    const alpha = m.ttl / DEATH_MARKER_TTL;
    ctx.globalAlpha  = alpha;
    ctx.strokeStyle  = COLORS[m.colorIndex];
    ctx.lineWidth    = 2;
    const s = 8;
    ctx.beginPath();
    ctx.moveTo(m.x - s, m.y - s);
    ctx.lineTo(m.x + s, m.y + s);
    ctx.moveTo(m.x + s, m.y - s);
    ctx.lineTo(m.x - s, m.y + s);
    ctx.stroke();
  }
  ctx.globalAlpha  = 1.0;
  state.deathMarkers = surviving;
}

// ==========================================
// Input handling
// ==========================================
function computeDir() {
  if (state.leftDown && state.rightDown) {
    return state.lastPressedSide === 'left' ? -1 : 1;
  }
  if (state.leftDown)  return -1;
  if (state.rightDown) return  1;
  return 0;
}

function sendDir() {
  const dir = computeDir();
  if (dir !== state.lastSentDir) {
    state.lastSentDir = dir;
    send({ type: 'input', dir });
  }
}

document.addEventListener('keydown', (e) => {
  if (state.phase !== 'playing') return;

  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault();
      if (!state.leftDown) {
        state.leftDown       = true;
        state.lastPressedSide = 'left';
        sendDir();
      }
      break;

    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault();
      if (!state.rightDown) {
        state.rightDown      = true;
        state.lastPressedSide = 'right';
        sendDir();
      }
      break;

    case ' ':
      e.preventDefault();
      if (!e.repeat) {
        send({ type: 'use_power' });
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      state.leftDown = false;
      sendDir();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      state.rightDown = false;
      sendDir();
      break;
  }
});

// Reset input when tab/window loses focus (prevents stuck keys)
window.addEventListener('blur', () => {
  state.leftDown  = false;
  state.rightDown = false;
  if (state.phase === 'playing') {
    send({ type: 'input', dir: 0 });
    state.lastSentDir = 0;
  }
});

// ==========================================
// Button handlers
// ==========================================
$('btn-create').addEventListener('click', () => {
  const name = $('player-name').value.trim();
  if (!name) {
    $('lobby-error').textContent = 'Please enter your name.';
    return;
  }
  $('lobby-error').textContent = '';
  state.pendingName = name;
  connect({ type: 'create_room', name });
});

$('btn-join').addEventListener('click', () => {
  const name   = $('player-name').value.trim();
  const roomId = $('room-code-input').value.trim().toUpperCase();
  if (!name) {
    $('lobby-error').textContent = 'Please enter your name.';
    return;
  }
  if (!roomId) {
    $('lobby-error').textContent = 'Please enter a room code.';
    return;
  }
  $('lobby-error').textContent = '';
  state.pendingName = name;
  connect({ type: 'join_room', roomId, name });
});

$('btn-start').addEventListener('click', () => {
  send({ type: 'start_game' });
});

$('btn-play-again').addEventListener('click', () => {
  // Reset client game state; server still has room & players
  state.trails       = {};
  state.snapshot     = null;
  state.deathMarkers = [];
  state.phase        = 'lobby';
  state.roundNumber  = 0;
  for (const p of Object.values(state.players)) {
    p.score       = 0;
    p.alive       = true;
    p.power       = null;
    p.powerActive = false;
  }

  showScreen('lobby');
  // Jump straight to waiting room (still in the room on server)
  $('room-waiting').classList.remove('hidden');
  $('room-code-display').textContent = state.roomId;
  if (state.isHost) {
    $('host-badge').classList.remove('hidden');
  }
  renderPlayerList();
  updateStartButton();
});

// Allow joining with Enter key in room code field
$('room-code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-join').click();
});

$('player-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-create').click();
});

// ==========================================
// Utility
// ==========================================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
