# Aurum Chess

A polished browser chess experience with Player vs AI and pass-and-play modes. Built with vanilla JS/HTML/CSS—no build tools required.

## Features
- **Game modes:** Player vs AI or local pass & play.
- **AI levels:** Easy (random), Medium/Hard powered by Stockfish (browser worker) with a built-in minimax fallback if Stockfish cannot load.
- **Post-game review:** Automatic Stockfish analysis after checkmate/stalemate/time loss in both AI and pass & play, including best-move recommendations and move quality badges (Best, Excellent, Good, Inaccuracy, Mistake, Blunder).
- **Two-page flow:** Homepage is pre-game setup only (mode, time, theme). Matches always run in the full-screen match page.
- **Time controls:** Untimed, 3:00, or 10:00 per side with flag-fall detection.
- **Focus Mode:** Distraction-free view with clocks, captured pieces, move list, and exit button.
- **Board skins & unlocks:** 10 themes; 1 is free, and the rest unlock as you beat the AI (progress stored in localStorage under `aurumUnlocks`).
- **Quality-of-life:** Undo, move list with castles/promotions, captured pieces tray, status/check highlights, toast notifications, subtle sounds, and a mute toggle for audio.
- **Accessibility polish:** Keyboard-friendly board navigation, clearer button labels, live status updates, and stronger focus styles for easier use on desktop and assistive devices.

## Getting Started
1) Clone or download this repository.
2) Open `index.html` in a modern browser (Chrome, Edge, Firefox, or Safari). No build step is needed.
3) Configure mode/time/theme on the homepage, then click **Start Game** to open `focus.html` for the match.

If you run into file system and storage/audio permission issues, open via a simple server (e.g., `npx serve` or `python -m http.server`) instead of double-clicking the file.

## How to Play
- **Start:** Configure settings on homepage and click **Start Game**.
- **AI difficulty:** Choose Easy/Medium/Hard before starting; difficulty is locked mid-game.
- **Moves:** Click a piece, then a highlighted square. You can also use the keyboard to move focus between squares and press Enter/Space to select or play a move. Legal moves include check, castling, en passant, and promotion (auto-queen).
- **Undo:** Reverts the last full turn; in AI mode, undo twice rolls back both sides.
- **Time controls:** Select before starting; timers auto-start on the first move. Flag ends the game.
- **Match page:** Gameplay runs only in the dedicated match page. After game end, **Review Game** and **Exit Match** appear.
- **Unlocks:** Win vs AI as White to increment your unlocked theme count (max 10). Reset via **Reset Unlocks**.

## Files
- `index.html` — setup homepage (mode, difficulty, time, themes).
- `focus.html` — dedicated full-screen match page.
- `styles/main.css` — glassy UI, board/piece styling, focus mode, toasts.
- `js/home.js` — homepage setup logic and match settings persistence.
- `js/app.js` — UI wiring, game flow, timers, focus mode, unlock logic, sounds.
- `js/ai.js` — AI move selection with Stockfish UCI worker integration plus minimax fallback.
- `js/chessEngine.js` — chess rules, move history, and FEN export for external engine analysis.

## Notes
- Progress is stored locally; clearing site data resets unlocks.
- Sounds use the Web Audio API and may require a user gesture to start on some browsers. A mute toggle is available in the match page.
- Accessibility updates include keyboard-friendly board navigation, clearer labels, focus-visible states, and live status announcements.
- The engine treats a missing king as in check to guard against corrupted states.
- Stockfish is loaded at runtime from jsDelivr (`stockfish.js`). If the CDN is blocked/offline, AI falls back to the built-in engine automatically.
- Game review also relies on Stockfish runtime loading; if unavailable, review displays an error and can be retried with **Review Game**.

## Contributing
Bug reports and small improvements are welcome. Please keep dependencies to zero and stay within vanilla JS/HTML/CSS.

## Live Link

 - Running: https://reyadh418.github.io/Chess-Game-Project/
 - Source code: https://github.com/Reyadh418/Chess-Game-Project

## Visuals

<img width="1920" height="1840" alt="screencapture-reyadh418-github-io-Chess-Game-Project-2026-02-19-21_44_58" src="https://github.com/user-attachments/assets/9f37bad1-4579-4cd2-b2a6-dc5a1ac6cd3a" />

<img width="1919" height="878" alt="Screenshot 2026-02-19 214444" src="https://github.com/user-attachments/assets/8edaf17d-6f25-437d-b08f-db5498a847e6" />
