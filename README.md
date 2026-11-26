# Sky Courier — Ring Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/henahenah31-art/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/henahenah31-art/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete, original flight game for the [make.fun bounty "Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057): fly the courier plane through 9 glowing rings over Teluk Bay — river, harbour city, mountains — then land on runway 27 before the clock and fuel run out.

## Play

Serve `game/` with any static server and open `game/index.html` in a desktop browser (no network needed, no build step):

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

- **Arrow keys / WASD** — pitch and bank
- **Shift / Ctrl** — throttle up / down
- **Mouse drag** — steer
- **C** — chase / cockpit camera
- **Enter / click** — take off, **R** — fly again

The HUD shows altitude (FT), airspeed (KT) and heading on a compass tape, plus an artificial horizon, throttle and fuel gauges. Sounds are synthesised with WebAudio — no audio files.

## Screenshots

`shots.json` lists the four deterministic shots (`?shot=start|play&seed=N`):

1. `1-start.jpg` — on runway 27, ready for takeoff
2. `2-play.jpg` — chase view mid-flight, ring 3 ahead, runway in sight
3. `3-ring.jpg` — same flight, different valley seed
4. `4-landed.jpg` — delivery complete, landed on runway 27

## Layout

- `main.ts` — the entry program (Node 22): copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `game/` — the game itself, plain static files (`index.html` + ES modules under `src/`)
- `vendor/makefun-game.ts` — the kit's library, unchanged
- `serve.ts` — tiny static server for local play-testing
- `shots.json` — the screenshot list

## License

MIT — see [LICENSE](LICENSE).
