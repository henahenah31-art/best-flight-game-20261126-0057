// World: Teluk Bay — rolling green hills, a river, a small harbour city and one
// runway (RWY 27/09). All geometry is analytic + seeded noise, so the same seed
// always builds the same valley. Units are metres; y is up.
import { noise2, fbm2, clamp, lerp } from './random.js';

export const RUNWAY = { x0: -30, x1: 30, z0: 520, z1: 1500, heading: 0 }; // along +z
export const CITY = { cx: 260, cz: 1050, blocks: 6, spacing: 70 };

export function riverZ(x) {
  return 260 * Math.sin(x * 0.0016) + 120 * Math.sin(x * 0.004 + 1.7) - 260;
}

export function terrainHeight(x, z, seed) {
  let h = 16 * fbm2(x * 0.004, z * 0.004, seed) + 5 * noise2(x * 0.02, z * 0.02, seed + 5);
  // Mountains ringing the valley, far out.
  const d = Math.hypot(x, z - 900);
  if (d > 950) h += (d - 950) * 0.16;
  if (d > 1400) h += (d - 1400) * 0.25;
  // River valley: carve down near the river line.
  const rd = Math.abs(z - riverZ(x));
  if (rd < 90) h = lerp(-3, h, clamp((rd - 25) / 65, 0, 1));
  // Runway plateau: perfectly flat, blended at the edges.
  const ex = Math.max(RUNWAY.x0 - x, 0, x - RUNWAY.x1);
  const ez = Math.max(RUNWAY.z0 - z, 0, z - RUNWAY.z1);
  const edge = Math.hypot(ex, ez);
  if (edge < 60) h = lerp(0, h, clamp(edge / 60, 0, 1));
  return h;
}

export function isWater(x, z, seed) {
  return Math.abs(z - riverZ(x)) < 28 && terrainHeight(x, z, seed) < 0.5;
}

// Deterministic city: blocks of buildings east of the runway.
export function cityBuildings(seed) {
  const list = [];
  let n = 0;
  for (let bx = 0; bx < CITY.blocks; bx++) {
    for (let bz = 0; bz < CITY.blocks; bz++) {
      const x = CITY.cx + (bx - CITY.blocks / 2 + 0.5) * CITY.spacing;
      const z = CITY.cz + (bz - CITY.blocks / 2 + 0.5) * CITY.spacing;
      const r = noise2(bx * 3.1 + 0.5, bz * 2.7 + 0.5, seed + 11);
      if (r < -0.55) continue; // plaza / park gaps
      const w = 22 + Math.abs(noise2(bx, bz, seed + 21)) * 14;
      const depth = 22 + Math.abs(noise2(bx + 9, bz + 4, seed + 22)) * 14;
      const hgt = 12 + Math.abs(noise2(bx + 3, bz + 8, seed + 23)) * 42;
      list.push({ x, z, w, d: depth, h: hgt, id: n++ });
    }
  }
  return list;
}

// The ring course: 8 glowing rings leading out over the river, around the
// city and back to the runway threshold.
export function ringCourse(seed) {
  const pts = [
    { x: 0, y: 70, z: 700 },
    { x: -180, y: 95, z: 420 },
    { x: -320, y: 120, z: 60 },
    { x: -140, y: 90, z: -260 },
    { x: 160, y: 130, z: -420 },
    { x: 340, y: 100, z: -80 },
    { x: 300, y: 80, z: 420 },
    { x: 120, y: 55, z: 900 },
    { x: 0, y: 35, z: 1420 }, // final: over the runway threshold
  ];
  return pts.map((p, i) => ({ ...p, r: 20, index: i }));
}

// ---- 3D projection (pinhole camera) ----
export function makeCamera(w, h) {
  const fov = 62 * Math.PI / 180;
  const f = (h / 2) / Math.tan(fov / 2);
  return { w, h, cx: w / 2, cy: h / 2, f };
}

// Project a world point into screen space. Returns null behind the camera.
export function project(cam, camPos, yaw, pitch, roll, p) {
  const dx = p.x - camPos.x, dy = p.y - camPos.y, dz = p.z - camPos.z;
  // Rotate by -yaw around Y, then -pitch around X, then -roll around Z.
  const cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;
  const y1 = dy;
  const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  const x2 = x1;
  const cr = Math.cos(-roll), sr = Math.sin(-roll);
  const x3 = x2 * cr - y2 * sr;
  const y3 = x2 * sr + y2 * cr;
  const z3 = z2;
  if (z3 < 2) return null;
  return { x: cam.cx + cam.f * x3 / z3, y: cam.cy - cam.f * y3 / z3, z: z3 };
}

function shade(base, light) {
  // base: [r,g,b], light 0..1
  const f = 0.55 + 0.45 * light;
  return `rgb(${Math.round(base[0] * f)},${Math.round(base[1] * f)},${Math.round(base[2] * f)})`;
}

export function drawWorld(ctx, cam, camPos, yaw, pitch, roll, seed, buildings, rings, nextRing, timeSec) {
  const W = cam.w, H = cam.h;
  // Sky gradient + sun.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2f6fb8');
  sky.addColorStop(0.45, '#7db3e2');
  sky.addColorStop(0.62, '#cfe6f5');
  sky.addColorStop(1, '#dceefb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Sun (fixed in the west).
  const sun = project(cam, camPos, yaw, pitch, roll, { x: camPos.x - 2600, y: 900, z: camPos.z - 1800 });
  if (sun) {
    const g = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 90);
    g.addColorStop(0, 'rgba(255,246,200,0.95)');
    g.addColorStop(0.25, 'rgba(255,230,140,0.55)');
    g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sun.x, sun.y, 90, 0, Math.PI * 2); ctx.fill();
  }

  // Terrain grid ahead of the camera, far -> near.
  const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const CELL = 55;
  const COLS = 34, ROWS = 34;
  const grid = [];
  for (let r = ROWS; r >= 0; r--) {
    const along = -150 + r * CELL;
    const row = [];
    for (let c = 0; c <= COLS; c++) {
      const side = (c - COLS / 2) * CELL;
      const x = camPos.x + forward.x * along + right.x * side;
      const z = camPos.z + forward.z * along + right.z * side;
      const y = terrainHeight(x, z, seed);
      row.push({ x, y, z, water: isWater(x, z, seed) });
    }
    grid.push(row);
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = grid[r][c], b = grid[r][c + 1], d = grid[r + 1][c + 1], e = grid[r + 1][c];
      const pa = project(cam, camPos, yaw, pitch, roll, a);
      const pb = project(cam, camPos, yaw, pitch, roll, b);
      const pc = project(cam, camPos, yaw, pitch, roll, d);
      const pd = project(cam, camPos, yaw, pitch, roll, e);
      if (!pa || !pb || !pc || !pd) continue;
      const midH = (a.y + b.y + d.y + e.y) / 4;
      let col;
      if (a.water || b.water || d.water || e.water) col = [46, 118, 178];
      else if (midH > 90) col = [148, 138, 122]; // rock high up
      else if (midH > 45) col = [96, 128, 74];   // hills
      else col = [104, 160, 84];                  // valley fields
      // Patchwork fields: tint by cell hash.
      const tint = noise2(Math.floor((a.x + b.x) / 2 / CELL), Math.floor((a.z + e.z) / 2 / CELL), seed + 31);
      const light = clamp(0.86 + tint * 0.14, 0.6, 1);
      ctx.fillStyle = shade(col, light);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.lineTo(pc.x, pc.y); ctx.lineTo(pd.x, pd.y);
      ctx.closePath(); ctx.fill();
    }
  }

  // Runway: asphalt strip + centreline + threshold bars + "27".
  drawRunway(ctx, cam, camPos, yaw, pitch, roll, seed);

  // City buildings, far -> near.
  const sorted = [...buildings].sort((p, q) => {
    const dp = (p.x - camPos.x) ** 2 + (p.z - camPos.z) ** 2;
    const dq = (q.x - camPos.x) ** 2 + (q.z - camPos.z) ** 2;
    return dq - dp;
  });
  for (const b of sorted) drawBuilding(ctx, cam, camPos, yaw, pitch, roll, b, seed);

  // Clouds: soft white blobs at fixed seeded spots.
  for (let i = 0; i < 14; i++) {
    const cxp = (noise2(i * 7.3, 1.1, seed + 41) * 0.5 + 0.5) * 3200 - 1600;
    const czp = (noise2(i * 3.9, 4.4, seed + 42) * 0.5 + 0.5) * 3200 - 400;
    const cyp = 260 + Math.abs(noise2(i, 9.9, seed + 43)) * 160;
    const s = project(cam, camPos, yaw, pitch, roll, { x: cxp, y: cyp, z: czp });
    if (!s || s.z < 30) continue;
    const rad = clamp(9000 / s.z, 8, 90);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rad * 1.9, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x - rad, s.y + rad * 0.12, rad * 1.1, rad * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x + rad, s.y + rad * 0.12, rad * 1.1, rad * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rings: only the next one glows bright; later ones are faint guides.
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    const isNext = i === nextRing;
    const isDone = i < nextRing;
    if (isDone) continue;
    drawRing(ctx, cam, camPos, yaw, pitch, roll, ring, isNext, timeSec);
  }
}

function drawRunway(ctx, cam, camPos, yaw, pitch, roll, seed) {
  const y = 0.4; // just above the flattened ground
  // Draw in 60 m strips so a strip behind the camera is skipped, not the
  // whole runway (the near end is often behind the chase camera).
  const strip = (x0, x1, z0, z1, fill) => {
    const p = [
      { x: x0, y, z: z0 }, { x: x1, y, z: z0 },
      { x: x1, y, z: z1 }, { x: x0, y, z: z1 },
    ].map(c => project(cam, camPos, yaw, pitch, roll, c));
    if (p.some(v => !v)) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y);
    ctx.lineTo(p[2].x, p[2].y); ctx.lineTo(p[3].x, p[3].y);
    ctx.closePath(); ctx.fill();
  };
  for (let z = RUNWAY.z0; z < RUNWAY.z1; z += 60) {
    strip(RUNWAY.x0, RUNWAY.x1, z, Math.min(z + 60, RUNWAY.z1), '#3c4148');
  }
  // Centreline dashes.
  for (let z = RUNWAY.z0 + 40; z < RUNWAY.z1 - 20; z += 60) {
    strip(-1.5, 1.5, z, z + 28, '#f5f5f0');
  }
  // Threshold bars at both ends.
  for (const zt of [RUNWAY.z0 + 12, RUNWAY.z1 - 12]) {
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      strip(k * 7 - 2.5, k * 7 + 2.5, zt - 6, zt + 6, '#f5f5f0');
    }
  }
}

function drawBuilding(ctx, cam, camPos, yaw, pitch, roll, b, seed) {
  const hw = b.w / 2, hd = b.d / 2, top = b.h;
  const base = terrainHeight(b.x, b.z, seed);
  const pts = {
    bl: { x: b.x - hw, y: base, z: b.z - hd }, br: { x: b.x + hw, y: base, z: b.z - hd },
    fr: { x: b.x + hw, y: base, z: b.z + hd }, fl: { x: b.x - hw, y: base, z: b.z + hd },
    tl: { x: b.x - hw, y: base + top, z: b.z - hd }, tr: { x: b.x + hw, y: base + top, z: b.z - hd },
    tr2: { x: b.x + hw, y: base + top, z: b.z + hd }, tl2: { x: b.x - hw, y: base + top, z: b.z + hd },
  };
  const P = {};
  for (const k of Object.keys(pts)) {
    P[k] = project(cam, camPos, yaw, pitch, roll, pts[k]);
    if (!P[k]) return;
  }
  const tint = 0.75 + Math.abs(noise2(b.id, 5.5, seed + 51)) * 0.35;
  const wall = shade([122, 134, 150], tint);
  const wall2 = shade([96, 108, 128], tint);
  const roof = shade([70, 80, 96], tint);
  const quad = (a, b2, c, d, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath(); ctx.fill();
  };
  quad(P.tl, P.tr, P.br, P.bl, wall);       // back face
  quad(P.tr2, P.tl2, P.tl, P.tr, roof);     // roof
  quad(P.fl, P.fr, P.tr2, P.tl2, wall2);    // front face
  // Lit windows on the front face.
  ctx.fillStyle = 'rgba(255,214,120,0.85)';
  const rows = Math.max(1, Math.floor(b.h / 9));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      if (noise2(b.id * 3 + c, r * 7, seed + 61) < 0.1) continue;
      const wx = b.x - hw + (c + 0.5) * (b.w / 3);
      const wy = base + 4 + r * 9;
      const wp = project(cam, camPos, yaw, pitch, roll, { x: wx, y: wy, z: b.z + hd + 0.2 });
      if (!wp) continue;
      const s = clamp(600 / wp.z, 1, 5);
      ctx.fillRect(wp.x - s, wp.y - s * 1.4, s * 2, s * 2.8);
    }
  }
}

function drawRing(ctx, cam, camPos, yaw, pitch, roll, ring, isNext, timeSec) {
  const N = 28;
  const pts = [];
  // Ring plane faces the course direction: use the vector from the previous
  // ring (or the runway heading for the first ring).
  const pulse = isNext ? 1 + 0.12 * Math.sin(timeSec * 4) : 1;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const px = ring.x + Math.cos(a) * ring.r * pulse;
    const py = ring.y + Math.sin(a) * ring.r * pulse;
    const p = project(cam, camPos, yaw, pitch, roll, { x: px, y: py, z: ring.z });
    if (p) pts.push(p);
  }
  if (pts.length < 4) return;
  const c = project(cam, camPos, yaw, pitch, roll, ring);
  if (!c) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = isNext ? 'rgba(255,196,0,0.35)' : 'rgba(120,200,255,0.25)';
  ctx.lineWidth = isNext ? 14 : 8;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = isNext ? '#ffc400' : '#7ec8ff';
  ctx.lineWidth = isNext ? 5 : 3;
  ctx.stroke();
  if (isNext) {
    // Label sits just above the ring's top edge, clear of the aircraft.
    const top = project(cam, camPos, yaw, pitch, roll, { x: ring.x, y: ring.y + ring.r * pulse, z: ring.z });
    if (top) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(12, Math.round(900 / c.z))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1}`, top.x, top.y - 10);
    }
  }
  ctx.restore();
}
