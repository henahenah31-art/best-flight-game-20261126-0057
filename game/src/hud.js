// HUD: altitude / speed / heading tape, artificial horizon, throttle + fuel,
// score, timer, ring counter. All "instruments lit": glowing amber/cyan on dark.
export function drawHUD(ctx, W, H, s) {
  const pad = 16;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // --- Top bar: ALT / SPD / HDG ---
  const barH = 64;
  ctx.fillStyle = 'rgba(8,18,30,0.72)';
  roundRect(ctx, pad, pad, W - pad * 2, barH, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.5)'; ctx.lineWidth = 1;
  roundRect(ctx, pad, pad, W - pad * 2, barH, 10); ctx.stroke();

  const third = (W - pad * 2) / 3;
  const altFt = Math.round(s.plane.y * 3.28084);
  const spdKt = Math.round(s.plane.speed * 1.94384);
  const hdg = Math.round(((s.plane.heading * 180 / Math.PI) % 360 + 360) % 360);
  hudCell(ctx, pad + third * 0.5, pad + 34, 'ALTITUDE', `${altFt.toLocaleString('en-US')} FT`);
  hudCell(ctx, pad + third * 1.5, pad + 34, 'AIRSPEED', `${spdKt} KT`);
  hudCell(ctx, pad + third * 2.5, pad + 34, 'HEADING', `${String(hdg).padStart(3, '0')}°`);

  // Compass tape under the top bar.
  const tapeY = pad + barH + 26;
  ctx.fillStyle = 'rgba(8,18,30,0.6)';
  roundRect(ctx, W / 2 - 190, tapeY - 14, 380, 28, 8); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(W / 2 - 190, tapeY - 14, 380, 28); ctx.clip();
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (let d = -180; d <= 180; d += 15) {
    let deg = Math.round(hdg + d);
    deg = ((deg % 360) + 360) % 360;
    const x = W / 2 + d * 2.1;
    const label = deg % 90 === 0 ? ['N', 'E', 'S', 'W'][deg / 90] : String(deg).padStart(3, '0');
    ctx.fillText(label, x, tapeY + 5);
    ctx.fillRect(x - 0.5, tapeY - 12, 1, 6);
  }
  ctx.restore();
  // Centre caret.
  ctx.fillStyle = '#ffc400';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 7, tapeY - 16); ctx.lineTo(W / 2 + 7, tapeY - 16); ctx.lineTo(W / 2, tapeY - 6);
  ctx.closePath(); ctx.fill();

  // --- Left: artificial horizon ---
  const hx = pad + 78, hy = H - 108, hr = 62;
  ctx.save();
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.clip();
  ctx.translate(hx, hy);
  ctx.rotate(-s.plane.roll);
  ctx.translate(0, s.plane.pitch * 120);
  ctx.fillStyle = '#2f6fb8'; ctx.fillRect(-hr, -hr, hr * 2, hr);
  ctx.fillStyle = '#7a5230'; ctx.fillRect(-hr, 0, hr * 2, hr);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-hr, 0); ctx.lineTo(hr, 0); ctx.stroke();
  for (const dy of [-30, -15, 15, 30]) {
    ctx.beginPath(); ctx.moveTo(-18, dy); ctx.lineTo(18, dy); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffc400'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx - hr, hy); ctx.lineTo(hx - 18, hy);
  ctx.moveTo(hx + 18, hy); ctx.lineTo(hx + hr, hy);
  ctx.stroke();
  ctx.fillStyle = '#9fd8ff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', hx, hy + hr + 16);

  // --- Right: throttle + fuel ---
  const tx = W - pad - 150, ty = H - 150;
  ctx.fillStyle = 'rgba(8,18,30,0.72)';
  roundRect(ctx, tx, ty, 150, 132, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.5)';
  roundRect(ctx, tx, ty, 150, 132, 10); ctx.stroke();
  ctx.fillStyle = '#9fd8ff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', tx + 12, ty + 20);
  ctx.fillStyle = '#12324a'; ctx.fillRect(tx + 12, ty + 30, 126, 12);
  ctx.fillStyle = '#37c978'; ctx.fillRect(tx + 12, ty + 30, 126 * s.plane.throttle, 12);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText('FUEL', tx + 12, ty + 66);
  ctx.fillStyle = '#12324a'; ctx.fillRect(tx + 12, ty + 76, 126, 12);
  ctx.fillStyle = s.plane.fuel < 20 ? '#ff5a4e' : '#ffc400';
  ctx.fillRect(tx + 12, ty + 76, 126 * (s.plane.fuel / 100), 12);
  ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${Math.round(s.plane.fuel)}%`, tx + 12, ty + 112);

  // --- Score / rings / time (top-right under the bar) ---
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffc400'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${s.score}`, W - pad - 6, pad + barH + 62);
  ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`RINGS ${s.nextRing}/${s.rings.length}   TIME ${fmtTime(s.timeLeft)}`, W - pad - 6, pad + barH + 86);

  // --- Next-ring hint: arrow + distance, top-centre, clear of the aircraft ---
  if (s.state === 'playing' && s.nextRing < s.rings.length) {
    const ring = s.rings[s.nextRing];
    const dx = ring.x - s.plane.x, dz = ring.z - s.plane.z;
    const dist = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz) - s.plane.heading;
    const hy = pad + barH + 62;
    ctx.save();
    ctx.translate(W / 2 - 130, hy);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffc400';
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(10, 8); ctx.lineTo(-10, 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffc400'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`NEXT RING ${Math.round(dist)} m`, W / 2 - 110, hy + 5);
  }

  // --- Message line ---
  if (s.message) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
    ctx.fillText(s.message, W / 2, H * 0.30);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function hudCell(ctx, x, y, label, value) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fb8dd'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText(label, x, y - 16);
  ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 24px monospace, sans-serif';
  ctx.fillText(value, x, y + 12);
}

export function fmtTime(sec) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec) % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp2(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ---- Full-screen overlays ----
export function drawTitle(ctx, W, H, s) {
  ctx.fillStyle = 'rgba(6,14,24,0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc400';
  ctx.font = `bold ${Math.round(W * 0.055)}px sans-serif`;
  ctx.fillText('SKY COURIER', W / 2, H * 0.30);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(W * 0.022)}px sans-serif`;
  ctx.fillText('RING RUN OVER TELUK BAY', W / 2, H * 0.30 + 44);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '17px sans-serif';
  ctx.fillText('Fly the courier plane through all 9 glowing rings, then land on runway 27.', W / 2, H * 0.30 + 84);
  ctx.fillText('Arrow keys / WASD: pitch & bank   •   Shift / Ctrl: throttle   •   Mouse drag: steer   •   C: camera', W / 2, H * 0.30 + 112);
  ctx.fillStyle = '#ffc400';
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(s.timeSec * 4) > -0.2;
  if (blink) ctx.fillText('PRESS ENTER OR CLICK TO TAKE OFF', W / 2, H * 0.30 + 156);
  ctx.fillStyle = '#9fd8ff'; ctx.font = '14px sans-serif';
  ctx.fillText('Best ring run wins the courier contract — 240 seconds on the clock, watch your fuel.', W / 2, H * 0.30 + 188);
}

export function drawEnd(ctx, W, H, s) {
  ctx.fillStyle = 'rgba(6,14,24,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc400';
  // Shrink the title until it fits 90% of the width.
  let fs = Math.round(W * 0.04);
  ctx.font = `bold ${fs}px sans-serif`;
  while (fs > 16 && ctx.measureText(s.endTitle).width > W * 0.9) {
    fs -= 2;
    ctx.font = `bold ${fs}px sans-serif`;
  }
  ctx.fillText(s.endTitle, W / 2, H * 0.34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`FINAL SCORE  ${s.score}`, W / 2, H * 0.34 + 58);
  ctx.fillStyle = '#cfe8ff'; ctx.font = '18px sans-serif';
  ctx.fillText(`Rings flown: ${s.nextRing} of ${s.rings.length}   •   Time left: ${fmtTime(s.timeLeft)}   •   Fuel left: ${Math.round(s.plane.fuel)}%`, W / 2, H * 0.34 + 96);
  ctx.fillStyle = '#9fd8ff'; ctx.font = '16px sans-serif';
  ctx.fillText('Press R to fly again', W / 2, H * 0.34 + 136);
}
