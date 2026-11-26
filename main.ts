// Sky Courier — Ring Run. Entry program for make.fun best-flight-game-20261126-0057.
// Node 22, standard library only.
//
// The game itself is this directory's game/ folder: plain static files that a
// desktop browser loads offline (game/index.html plus its ES modules, no library,
// no network request). This program hands it in: it copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json — the summary
// the judge reads — with the vendored make.fun library (vendor/makefun-game.ts).
//
// Play it locally first: `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The dossier caps mirror the scorer's own limits, so a build this program
// accepts is one the scorer accepts too:
//   - at most 4 screenshots, each at most 256 KiB (the first, by name, is the cover)
//   - game/ holds at most 993 files, 48 MiB in all, no path over 1000 bytes
//   - /output as a whole shares the platform's 1000-entry, 64 MiB cap, so the
//     game files, the screenshots and dossier.json leave each other room.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Directory holding this file, and the output directory (or its local stand-in).
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The playable game, copied whole.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

// The screenshots: real renders of the game's own code (see shots.json).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads: an outline of the source plus the screenshots.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
