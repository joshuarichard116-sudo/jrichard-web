# Talvex lab: visual standard

Every new page, widget or fix in `index.html` follows these rules, so the lab always looks clean and close to a real FortiGate.

## Icons and symbols
- **Use only the shared line icons.** Call `gi('name')` (the `GIP` set next to `const I` in the UI script) or an `I.*` / `FXI.*` SVG. All of them are on a 24px grid with a 2px round stroke and use `currentColor`.
- **Never use emoji or text glyphs as icons.** That covers ✓ ✕ ✗ ⚠ ☠ ▾ ▲ ▼ ⇅ ◂ ○ ⛶ ⤢ ◷ ⊖ └ ★ and anything similar. If an icon is missing, add one path to `GIP` instead.
- **Status colour comes from the theme tokens** (`--ok`, `--warn`, `--bad`, `--accent`), never from the glyph itself.
- **Plain text is fine where a real device prints text.** CLI output, Terraform plans and validation messages stay as words ("Error:", "Warning:") or the box-drawing characters a real terminal uses.
- **Icon-only buttons need an `aria-label`.** Decorative icons get `aria-hidden="true"` (`gi()` adds it).

## Look and feel
- **Layout follows FortiOS 7.6.** Use the same widgets, columns, group rows and donut summaries as the real GUI. Lab-only teaching aids sit below the real widgets.
- **The futuristic finish stays subtle and flat.** That means 1px tinted hairlines, a soft glow line on widget tops, small HUD corner ticks, low-opacity glow on chart lines and donuts, and a slow scan sweep.
- **No 3D-rotated layers, and no CSS `filter` on animated or 3D content.** Some learners run older GPUs.
- **Animations respect `prefers-reduced-motion`** and pause when Live Mode is off.

## Data
- **Use fictional names only:** Talvex, TLX-*, example IPs (203.0.113.0/24, 198.51.100.0/24, 10.x) and locally administered MACs. Never copy hostnames, IPs, serials or MACs from real screenshots.
