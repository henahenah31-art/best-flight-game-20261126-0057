// Sky Courier — Ring Run. Entry for make.fun best-flight-game-20261126-0057.
// Canvas 2D pseudo-3D flight game: chase view over a seeded valley (river,
// harbour city, runway 27), 9 glowing rings, HUD with lit instruments.
import { newPlane, stepPlane, groundState, drawPlane } from './plane.js';
import { makeCamera, project, drawWorld, ringCourse, cityBuildings, terrainHeight, RUNWAY } from './world.js';
import { drawHUD, drawTitle, drawEnd } from './hud.js';
import { Sound } from './audio.js';
import { applyShot } from './shots.js';
import { clamp } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || '1') || 1;
const SHOT = params.get('shot');

const sound = new Sound();
const buildings = cityBuildings(SEED);
const rings = ringCourse(SEED);

const state = {
  plane: newPlane(),
  rings,
  nextRing: 0,
  score: 0,
  timeLeft: 240,
  timeSec: 0,
  state: 'title', // title | playing | ended
  message: '',
  messageUntil: 0,
  endTitle: '',
  camera: 'chase', // chase | cockpit
  shotMode: false,
  crashed: false,
};

const keys = {};
let mouse = { down: false, x: 0, y: 0, dx: 0, dy: 0 };

function say(msg, secs = 2.5) {
  state.message = msg;
  state.messageUntil = state.timeSec + secs;
  statusEl.textContent = msg;
}

function resetGame() {
  state.plane = newPlane();
  state.nextRing = 0;
  state.score = 0;
  state.timeLeft = 240;
  state.state = 'playing';
  state.crashed = false;
  state.endTitle = '';
  say('TAKE OFF — FLY THROUGH RING 1', 3);
}

function startPlaying() {
  if (state.state === 'title') { resetGame(); sound.unlock(); }
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Enter' && state.state === 'title') startPlaying();
  if (e.key.toLowerCase() === 'r' && state.state === 'ended') resetGame();
  if (e.key.toLowerCase() === 'c') state.camera = state.camera === 'chase' ? 'cockpit' : 'chase';
  if (e.key === ' ' && state.state === 'title') startPlaying();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('pointerdown', (e) => {
  mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY;
  sound.unlock();
  if (state.state === 'title') startPlaying();
});
window.addEventListener('pointerup', () => { mouse.down = false; mouse.dx = 0; mouse.dy = 0; });
window.addEventListener('pointermove', (e) => {
  if (!mouse.down) return;
  mouse.dx = (e.clientX - mouse.x) / 120;
  mouse.dy = (e.clientY - mouse.y) / 120;
  mouse.x = e.clientX; mouse.y = e.clientY;
});

function readInput() {
  const rollIn = (keys['arrowleft'] || keys['a'] ? -1 : 0) + (keys['arrowright'] || keys['d'] ? 1 : 0);
  // pitch input: positive = climb (ArrowUp / drag up).
  const pitchIn = (keys['arrowup'] || keys['w'] ? 1 : 0) + (keys['arrowdown'] || keys['s'] ? -1 : 0);
  const thrIn = (keys['shift'] ? 1 : 0) + (keys['control'] ? -1 : 0);
  return {
    roll: clamp(rollIn + mouse.dx, -1, 1),
    pitch: clamp(pitchIn - mouse.dy, -1, 1),
    throttle: thrIn,
  };
}

function checkRings() {
  if (state.nextRing >= rings.length) return;
  const ring = rings[state.nextRing];
  const p = state.plane;
  const d = Math.hypot(p.x - ring.x, p.y - ring.y, p.z - ring.z);
  if (d < ring.r + 4) {
    state.score += 100 + Math.round(state.timeLeft);
    state.nextRing++;
    sound.ring();
    if (state.nextRing >= rings.length) {
      say('ALL RINGS FLOWN — LAND ON RUNWAY 27', 4);
    } else {
      say(`RING ${state.nextRing} CLEARED  •  +${100 + Math.round(state.timeLeft)} PTS`, 2.5);
    }
  }
}

function checkGround() {
  const p = state.plane;
  const g = groundState(p, SEED);
  if (g.heightAbove > 2.5) return;
  if (p.onGround && p.speed < 2 && state.state === 'playing') {
    // Stopped on the ground.
    if (g.onRunway && state.nextRing >= rings.length) {
      endGame('DELIVERY COMPLETE — LANDED ON RUNWAY 27', 500);
    } else if (g.onRunway) {
      endGame('LANDED EARLY — RUNWAY 27 (RINGS MISSED)', 150);
    } else {
      endGame('FORCED LANDING IN THE FIELDS', 0);
    }
    return;
  }
  if (p.speed > 42 && !g.onRunway) {
    // Hit the ground fast, off-runway: crash.
    endGame('CRASHED — THE COURIER IS DOWN', 0, true);
  }
}

function endGame(title, bonus, crashed = false) {
  state.state = 'ended';
  state.endTitle = title;
  state.score += bonus;
  state.crashed = crashed;
  if (crashed) sound.crash(); else sound.fanfare();
  sound.stopEngine();
  statusEl.textContent = `${title}. Final score ${state.score}.`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;
  const cam = makeCamera(W, H);
  const p = state.plane;

  if (!state.shotMode) state.timeSec += dt;
  else state.timeSec = 2.0; // frozen frame for screenshots

  if (state.state === 'playing' && !state.shotMode) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endGame(state.nextRing >= rings.length ? 'TIME UP — RINGS DONE, NO LANDING' : 'TIME UP — OUT OF TIME', 0);
    }
    const input = readInput();
    stepPlane(p, input, dt, SEED);
    checkRings();
    checkGround();
    sound.setEngine(p.throttle, p.speed);
    if (state.message && state.timeSec > state.messageUntil) state.message = '';
  }

  // Camera: chase (behind + above the plane) or cockpit (at the nose).
  let camPos, yaw, pitch, roll;
  if (state.camera === 'cockpit') {
    camPos = { x: p.x, y: p.y + 1.2, z: p.z };
    yaw = p.heading; pitch = p.pitch; roll = p.roll * 0.4;
  } else {
    const back = 13, up = 4.2;
    camPos = {
      x: p.x - Math.sin(p.heading) * back,
      y: p.y + up,
      z: p.z - Math.cos(p.heading) * back,
    };
    yaw = p.heading; pitch = p.pitch * 0.6 - 0.06; roll = p.roll * 0.55;
  }

  drawWorld(ctx, cam, camPos, yaw, pitch, roll, SEED, buildings, rings, state.nextRing, state.timeSec);

  if (state.camera === 'chase') {
    drawPlane(ctx, W, H, p.roll, p.pitch, p.throttle, state.timeSec, state.state === 'playing');
  } else {
    // Cockpit: nose + panel edge at the bottom of the frame.
    ctx.fillStyle = '#20262e';
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(W * 0.32, H * 0.86); ctx.lineTo(W * 0.68, H * 0.86); ctx.lineTo(W, H);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(W * 0.32, H * 0.86, W * 0.36, 4);
  }

  drawHUD(ctx, W, H, state);
  if (state.state === 'title') drawTitle(ctx, W, H, state);
  if (state.state === 'ended') drawEnd(ctx, W, H, state);

  requestAnimationFrame(frame);
}

if (SHOT) {
  applyShot(state, SHOT, SEED);
  // Render a few frames so fonts/canvas settle, then stop animating state.
  requestAnimationFrame(frame);
} else {
  requestAnimationFrame(frame);
}
