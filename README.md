# Aurum Chess

A polished, single-page chess experience with Player vs AI and pass-and-play modes. Built with vanilla JS/HTML/CSS—no build tools required.

## Features
- **Game modes:** Player vs AI or local pass & play.
- **AI levels:** Easy (random), Medium (shallow search), Hard (deeper minimax with alpha-beta) plus deliberate move timing.
- **Time controls:** Untimed, 3:00, or 10:00 per side with flag-fall detection.
- **Focus Mode:** Distraction-free view with clocks, captured pieces, move list, and exit button.
- **Board skins & unlocks:** 10 themes; 1 is free and the rest unlock as you beat the AI (progress stored in localStorage under `aurumUnlocks`).
- **Quality-of-life:** Undo, move list with castles/promotions, captured pieces tray, status/check highlights, toast notifications, and subtle sounds.

## Getting Started
1) Clone or download this repository.
2) Open `index.html` in a modern browser (Chrome, Edge, Firefox, or Safari). No build step is needed.

If you run from the file system and hit storage/audio permission issues, open via a simple server (e.g., `npx serve` or `python -m http.server`) instead of double-clicking the file.

## How to Play
- **Start:** Click **Start Game**. Pick mode (AI or Pass & Play) before the first move.
- **AI difficulty:** Choose Easy/Medium/Hard before starting; difficulty is locked mid-game.
- **Moves:** Click a piece, then a highlighted square. Legal moves respect check, castling, en passant, and promotion (auto-queen).
- **Undo:** Reverts the last full turn; in AI mode, undo twice rolls back both sides.
- **Time controls:** Select before starting; timers auto-start on the first move. Flag ends the game.
- **Focus Mode:** Toggle via **Focus Mode**; exit with ✕. State stays in sync with the main view.
- **Unlocks:** Win vs AI as White to increment your unlocked theme count (max 10). Reset via **Reset Unlocks**.

## Files
- `index.html` — page layout and templates.
- `styles/main.css` — glassy UI, board/piece styling, focus mode, toasts.
- `js/app.js` — UI wiring, game flow, timers, focus mode, unlock logic, sounds.
- `js/ai.js` — AI move selection (random/heuristic/minimax with alpha-beta and evaluation).
- `js/chessEngine.js` — chess rules: legal move generation, castling, en passant, promotion, check/checkmate/stalemate detection, move history.

## Notes
- Progress is stored locally; clearing site data resets unlocks.
- Sounds use the Web Audio API and may require a user gesture to start on some browsers.
- The engine treats a missing king as in check to guard against corrupted states.

## Contributing
Bug reports and small improvements are welcome. Please keep dependencies zero and stay within vanilla JS/HTML/CSS.
