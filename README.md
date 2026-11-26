# Hack Computer Lab — Nand to Tetris Capstone

Interactive capstone site for **ETCNTC301 · Make the Computer Draw a Box** (K.R. Mangalam University).

Everything runs in the browser — real HDL sources, a live two-pass assembler, and a 16-bit Hack CPU emulator that paints the Screen memory. No build step, no dependencies.

## Live demo

**https://rajourjatin241-ctrl.github.io/krmu-nand-capstone/**

## What's inside

| Part | Marks | Content |
| --- | --- | --- |
| A | 2.5 | `CPU.hdl`, `Memory.hdl`, `Computer.hdl` — pin maps, annotated source, downloads |
| B | 3.0 | Live two-pass assembler: labels, variables, A/C encoding, duplicate-label warning |
| C | 2.5 | Hack CPU + screen emulator — hold any key to draw the box |
| Viva | 2.0 | Submission checklist and downloadable deliverables package |

## Run locally

Double-click `index.html`, or:

```bash
python3 -m http.server 3000
# open http://localhost:3000
```

## Roll → parameters

Roll **2501630022** → **K = 22**

- Box starts at row 22, 4 words (64 px) wide, 20 rows tall
- Start address `16384 + 32×22 = 17088`, last word `17699`
- `K mod 3 = 1`, `K mod 4 = 2`

Change the roll input on the page and every number (header, addresses, editor comments, emulator monitor) re-derives automatically.

## Structure

```
index.html          single-page site (Parts A/B/C + submission)
css/style.css       design system
js/data.js          project data, Box.asm template, HDL sources
js/assembler.js     two-pass Hack assembler
js/emulator.js      Hack CPU + screen emulator
assets/fonts/       locally bundled woff2 fonts
assets/downloads/   HDL chips, assembler.py, Box.asm/.hack, project zip
```

## Credits

Course: ETCNTC301 — Nand to Tetris I · School of Engineering & Technology, K.R. Mangalam University.
