// The courier plane: arcade flight model + the chase-view drawing.
import { clamp } from './random.js';
import { terrainHeight as th, RUNWAY } from './world.js';

export function newPlane() {
  return {
    x: 0, y: 2, z: RUNWAY.z0 + 60, // on the runway, ready for takeoff
    heading: 0, pitch: 0, roll: 0,
    speed: 0, throttle: 0, fuel: 100,
    onGround: true,
  };
}

export function stepPlane(p, input, dt, seed) {
  // Roll and pitch ease toward the pilot's input.
  const targetRoll = (input.roll) * 0.9;
  const targetPitch = (input.pitch) * 0.38;
  p.roll += (targetRoll - p.roll) * Math.min(1, dt * 3.2);
  p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 2.6);
  p.throttle = clamp(p.throttle + input.throttle * dt * 0.5, 0, 1);

  // Turn rate follows bank; pitch follows the elevator.
  p.heading += -p.roll * 0.55 * dt * (0.4 + p.speed / 60);
  const climb = Math.sin(p.pitch);
  const accel = p.throttle * 26 - 6 - p.speed * 0.055 - climb * 22;
  p.speed = clamp(p.speed + accel * dt, 0, 95);

  // Stall: below 24 m/s the nose drops and the plane sinks.
  let sink = 0;
  if (p.speed < 24 && !p.onGround) {
    p.pitch += (-0.25 - p.pitch) * Math.min(1, dt * 1.5);
    sink = (24 - p.speed) * 0.35;
  }

  const ground = th(p.x, p.z, seed);
  const vy = p.speed * Math.sin(p.pitch) - sink;
  const vx = Math.sin(p.heading) * Math.cos(p.pitch) * p.speed;
  const vz = Math.cos(p.heading) * Math.cos(p.pitch) * p.speed;
  p.x += vx * dt;
  p.z += vz * dt;
  p.y += vy * dt;

  // Takeoff / landing.
  if (p.y <= ground + 1.6) {
    p.y = ground + 1.6;
    if (p.speed > 55 && Math.abs(p.pitch) < 0.15 && p.onGround === false) {
      // touched down fast and flat: keep rolling
    }
    p.onGround = p.speed < 30;
    if (p.onGround) p.pitch = 0;
  } else {
    p.onGround = false;
  }

  // Fuel burns with throttle; empty tank means gliding only.
  p.fuel = clamp(p.fuel - p.throttle * dt * 0.55, 0, 100);
  if (p.fuel <= 0) p.throttle = Math.max(0, p.throttle - dt * 0.5);

  // Soft world edge: steer back toward the valley.
  const d = Math.hypot(p.x, p.z - 900);
  if (d > 1650) {
    const back = Math.atan2(-p.x, 900 - p.z);
    let dh = back - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    p.heading += clamp(dh, -1, 1) * dt * 0.5;
  }
  return p;
}

export function groundState(p, seed) {
  const g = th(p.x, p.z, seed);
  const onRunway = p.x > RUNWAY.x0 - 5 && p.x < RUNWAY.x1 + 5 &&
    p.z > RUNWAY.z0 && p.z < RUNWAY.z1;
  return { ground: g, onRunway, heightAbove: p.y - g };
}

// Chase-view drawing: the courier plane seen from behind and slightly above,
// banking with its roll. Drawn at screen centre, sized to the viewport.
export function drawPlane(ctx, W, H, roll, pitch, throttle, timeSec, propBlur) {
  const cx = W / 2, cy = H * 0.56;
  const S = Math.min(W, H) / 520; // scale
  ctx.save();
  ctx.translate(cx, cy + pitch * 60);
  ctx.rotate(roll * 0.85);
  ctx.scale(S, S);
  // Soft shadow blob under the plane (its shadow on the ground is implied).
  // Tail (far end, drawn first).
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-8, -78); ctx.lineTo(8, -78); ctx.lineTo(4, -52); ctx.lineTo(-4, -52);
  ctx.closePath(); ctx.fill();
  // Horizontal stabiliser.
  ctx.fillStyle = '#a93226';
  ctx.beginPath();
  ctx.moveTo(-46, -58); ctx.lineTo(46, -58); ctx.lineTo(40, -46); ctx.lineTo(-40, -46);
  ctx.closePath(); ctx.fill();
  // Main wings.
  ctx.fillStyle = '#e8b64c';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(150, 6); ctx.lineTo(132, 26); ctx.lineTo(-132, 26);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-132, 26); ctx.lineTo(-132, 14); ctx.lineTo(-150, 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(150, 6); ctx.lineTo(132, 26); ctx.lineTo(132, 14); ctx.lineTo(150, 2);
  ctx.closePath(); ctx.fill();
  // Fuselage.
  const fus = ctx.createLinearGradient(-14, 0, 14, 0);
  fus.addColorStop(0, '#f4f6f8');
  fus.addColorStop(0.5, '#ffffff');
  fus.addColorStop(1, '#d5dde3');
  ctx.fillStyle = fus;
  ctx.beginPath();
  ctx.moveTo(0, -84);
  ctx.quadraticCurveTo(16, -60, 15, -20);
  ctx.quadraticCurveTo(14, 26, 9, 52);
  ctx.quadraticCurveTo(0, 62, -9, 52);
  ctx.quadraticCurveTo(-14, 26, -15, -20);
  ctx.quadraticCurveTo(-16, -60, 0, -84);
  ctx.closePath(); ctx.fill();
  // Red cheatline stripe.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-13, -30); ctx.lineTo(13, -30); ctx.lineTo(12, -18); ctx.lineTo(-12, -18);
  ctx.closePath(); ctx.fill();
  // Cockpit windows.
  ctx.fillStyle = '#1c2f45';
  ctx.beginPath();
  ctx.ellipse(0, -44, 8.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-2.5, -46, 4, 3.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Propeller (front, below the nose in rear view): blurred disc + blades.
  const prop = propBlur ? 0.25 + 0.2 * Math.sin(timeSec * 40) : 0.5;
  ctx.strokeStyle = `rgba(40,40,40,${prop})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 58); ctx.lineTo(0, 96);
  ctx.moveTo(0, 58); ctx.lineTo(0, 20);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,60,60,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 58, 26, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights.
  ctx.fillStyle = '#ff2d2d';
  ctx.beginPath(); ctx.arc(-150, 14, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2dff5e';
  ctx.beginPath(); ctx.arc(150, 14, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
