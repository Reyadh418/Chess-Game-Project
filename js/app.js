import { ChessEngine } from './chessEngine.js';
import { AiPlayer } from './ai.js';

let boardEl;
let statusText;
let turnText;
let unlockText;
let moveListEl;
let modeAIButton;
let modePvpButton;
let aiControls;
let timeButtons;
let newGameBtn;
let resetProgressBtn;
let undoBtn;
let themeGrid;
let themeTemplate;
let clockEls;

// Captured pieces
let capturedWhiteEl;
let capturedBlackEl;
let capturedPieces = { w: [], b: [] }; // w = captured BY white, b = captured BY black

// Focus mode
let focusLayout;
let focusBoard;
let focusBoardShell;
let focusMoveList;
let focusStatusText;
let focusTurnText;
let focusTimeWhite;
let focusTimeBlack;
let focusCapturedWhite;
let focusCapturedBlack;
let isFocusMode = false;

let engine = new ChessEngine();
let ai = new AiPlayer('easy');
let mode = 'ai';
let selectedSquare = null;
let legalMovesCache = [];
let lastMoveSquares = [];
let activeTheme = 0;
const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (_) {
            // storage blocked (private mode); ignore silently
        }
    },
};

let unlockCount = 1;
let timeControl = 'untimed';
let timers = { w: null, b: null };
let timerInterval = null;
let lastTick = null;
let gameOver = false;

const themes = [
    { id: 0, name: 'Polished Quartz', light: '#f7f8fc', dark: '#cad1e5' },
    { id: 1, name: 'Amberwood', light: '#f8f0df', dark: '#d8b889' },
    { id: 2, name: 'Mint Crest', light: '#e7fff3', dark: '#9de5c2' },
    { id: 3, name: 'Blush Silk', light: '#ffeef5', dark: '#f3a6cd' },
    { id: 4, name: 'Polar Sky', light: '#f2f7ff', dark: '#9fbdfc' },
    { id: 5, name: 'Violet Crown', light: '#f9f2ff', dark: '#c9a6f7' },
    { id: 6, name: 'Glacier Fade', light: '#eef6f7', dark: '#89b6c4' },
    { id: 7, name: 'Champagne', light: '#f7f3ef', dark: '#c7b09d' },
    { id: 8, name: 'Garden Glass', light: '#f6fff7', dark: '#b5f0c2' },
    { id: 9, name: 'Frosted Slate', light: '#f6f7fb', dark: '#bfc2d7' },
];

const pieceIcons = {
    wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
    bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

function init() {
    boardEl = document.getElementById('board');
    statusText = document.getElementById('statusText');
    turnText = document.getElementById('turnText');
    unlockText = document.getElementById('unlockText');
    moveListEl = document.getElementById('moveList');
    modeAIButton = document.getElementById('modeAI');
    modePvpButton = document.getElementById('modePvp');
    aiControls = document.getElementById('aiControls');
    timeButtons = document.querySelectorAll('#timeControls .chip');
    newGameBtn = document.getElementById('newGameBtn');
    resetProgressBtn = document.getElementById('resetProgressBtn');
    undoBtn = document.getElementById('undoBtn');
    themeGrid = document.getElementById('themeGrid');
    themeTemplate = document.getElementById('themeCardTemplate');
    clockEls = {
        w: document.getElementById('timeWhite'),
        b: document.getElementById('timeBlack'),
    };

    // Captured pieces elements
    capturedWhiteEl = document.getElementById('capturedWhite');
    capturedBlackEl = document.getElementById('capturedBlack');

    // Focus mode elements
    focusLayout = document.getElementById('focusLayout');
    focusBoard = document.getElementById('focusBoard');
    focusBoardShell = document.getElementById('focusBoardShell');
    focusMoveList = document.getElementById('focusMoveList');
    focusStatusText = document.getElementById('focusStatusText');
    focusTurnText = document.getElementById('focusTurnText');
    focusTimeWhite = document.getElementById('focusTimeWhite');
    focusTimeBlack = document.getElementById('focusTimeBlack');
    focusCapturedWhite = document.getElementById('focusCapturedWhite');
    focusCapturedBlack = document.getElementById('focusCapturedBlack');

    unlockCount = loadUnlocks();

    buildBoard();
    buildFocusBoard();
    bindControls();
    renderThemes();
    selectTheme(activeTheme);
    refreshUnlockDisplay();
    startNewGame();
}

function buildBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('button');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.square = engine.coordsToSquare(row, col);
            square.addEventListener('click', () => onSquareClick(square.dataset.square));
            boardEl.appendChild(square);
        }
    }
}

function buildFocusBoard() {
    if (!focusBoard) return;
    focusBoard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('button');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.square = engine.coordsToSquare(row, col);
            square.addEventListener('click', () => onSquareClick(square.dataset.square));
            focusBoard.appendChild(square);
        }
    }
}

function bindControls() {
    modeAIButton.addEventListener('click', () => setMode('ai'));
    modePvpButton.addEventListener('click', () => setMode('pvp'));
    document.querySelectorAll('#aiControls .seg').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#aiControls .seg').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ai.setDifficulty(btn.dataset.difficulty);
        });
    });

    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            timeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            timeControl = btn.dataset.time;
            resetTimers();
        });
    });

    newGameBtn.addEventListener('click', startNewGame);
    document.getElementById('focusModeBtn').addEventListener('click', () => toggleFocusMode(true));
    document.getElementById('exitFocusBtn').addEventListener('click', () => toggleFocusMode(false));
    document.getElementById('focusUndoBtn').addEventListener('click', () => {
        if (engine.history.length === 0 || gameOver) return;
        engine.undo();
        if (mode === 'ai' && engine.turn === 'b' && engine.history.length) {
            engine.undo();
        }
        rebuildCapturedFromHistory();
        refreshBoard();
        updateStatus();
    });
    resetProgressBtn.addEventListener('click', () => {
        unlockCount = 1;
        saveUnlocks();
        renderThemes();
        refreshUnlockDisplay();
    });
    undoBtn.addEventListener('click', () => {
        if (engine.history.length === 0 || gameOver) return;
        engine.undo();
        // If undoing after AI moved, undo twice to revert to player turn
        if (mode === 'ai' && engine.turn === 'b' && engine.history.length) {
            engine.undo();
        }
        rebuildCapturedFromHistory();
        refreshBoard();
        updateStatus();
    });
}

function setMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    modeAIButton.classList.toggle('active', nextMode === 'ai');
    modePvpButton.classList.toggle('active', nextMode === 'pvp');
    aiControls.style.display = nextMode === 'ai' ? 'block' : 'none';
    startNewGame();
}

function renderThemes() {
    if (!themeTemplate || !themeGrid) {
        console.warn('Theme template missing in DOM');
        return;
    }
    if (activeTheme + 1 > unlockCount) {
        activeTheme = 0;
    }
    themeGrid.innerHTML = '';
    themes.forEach(theme => {
        const card = themeTemplate.content.firstElementChild.cloneNode(true);
        card.classList.add(`theme-${theme.id}`);
        card.querySelector('.swatch').style.background = `linear-gradient(135deg, ${theme.light}, ${theme.dark})`;
        card.querySelector('.title').textContent = theme.name;
        card.dataset.theme = theme.id;

        const locked = theme.id + 1 > unlockCount;
        card.classList.toggle('locked', locked);
        card.querySelector('.lock').textContent = locked ? 'Locked' : 'Unlocked';
        if (!locked) {
            card.addEventListener('click', () => selectTheme(theme.id));
        }
        if (activeTheme === theme.id) {
            card.classList.add('active');
        }
        themeGrid.appendChild(card);
    });
}

function selectTheme(id) {
    activeTheme = id;
    document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', Number(c.dataset.theme) === id));
    const themeClass = `board-shell theme-${id}`;
    const shell = document.querySelector('.board-wrapper .board-shell');
    if (shell) shell.className = themeClass;
    if (focusBoardShell) focusBoardShell.className = themeClass;
}

function startNewGame() {
    engine.reset();
    lastMoveSquares = [];
    selectedSquare = null;
    legalMovesCache = [];
    gameOver = false;
    capturedPieces = { w: [], b: [] };
    if (moveListEl) moveListEl.innerHTML = '';
    if (focusMoveList) focusMoveList.innerHTML = '';
    renderCaptured();
    resetTimers();
    refreshBoard();
    updateStatus('New game ready');
    if (mode === 'ai' && engine.turn === 'b') {
        makeAIMove();
    }
}

function refreshBoard() {
    const snapshot = engine.getBoardSnapshot();
    const legalMoves = engine.generateLegalMoves(engine.turn);
    legalMovesCache = legalMoves;

    // render both boards (normal + focus)
    const boards = [boardEl, focusBoard].filter(Boolean);
    boards.forEach(bEl => {
        bEl.querySelectorAll('.square').forEach(square => {
            const algebraic = square.dataset.square;
            const { row, col } = engine.squareToCoords(algebraic);
            const piece = snapshot[row][col];
            square.innerHTML = '';
            square.classList.remove('selected', 'highlight-move', 'capture', 'last-move', 'in-check');

            if (piece) {
                const icon = pieceIcons[`${piece.color}${piece.type}`];
                const span = document.createElement('span');
                span.className = `piece piece-${piece.color}`;
                span.textContent = icon;
                square.appendChild(span);
            }

            if (lastMoveSquares.includes(algebraic)) {
                square.classList.add('last-move');
            }
        });

        const kingPos = engine.findKing(engine.turn);
        if (kingPos && engine.isInCheck(engine.turn)) {
            const sq = engine.coordsToSquare(kingPos.row, kingPos.col);
            const el = bEl.querySelector(`[data-square="${sq}"]`);
            if (el) el.classList.add('in-check');
        }
    });

    renderCaptured();
}

function onSquareClick(square) {
    if (gameOver) return;
    if (mode === 'ai' && engine.turn === 'b') return; // AI thinking

    const { row, col } = engine.squareToCoords(square);
    const piece = engine.getPiece(row, col);

    if (selectedSquare === square) {
        clearHighlights();
        selectedSquare = null;
        return;
    }

    // Attempt move if selection exists
    if (selectedSquare) {
        const move = legalMovesCache.find(m => engine.coordsToSquare(m.from.row, m.from.col) === selectedSquare && engine.coordsToSquare(m.to.row, m.to.col) === square);
        if (move) {
            makePlayerMove(move);
            return;
        }
    }

    // Select new piece if it belongs to the current player
    if (piece && piece.color === engine.turn) {
        selectedSquare = square;
        showHighlights(square);
    }
}

function showHighlights(square) {
    clearHighlights();
    const moves = legalMovesCache.filter(m => engine.coordsToSquare(m.from.row, m.from.col) === square);
    const boards = [boardEl, focusBoard].filter(Boolean);
    boards.forEach(bEl => {
        const squareEl = bEl.querySelector(`[data-square="${square}"]`);
        if (squareEl) squareEl.classList.add('selected');
        moves.forEach(m => {
            const target = engine.coordsToSquare(m.to.row, m.to.col);
            const targetEl = bEl.querySelector(`[data-square="${target}"]`);
            if (targetEl) {
                targetEl.classList.add('highlight-move');
                if (engine.getPiece(m.to.row, m.to.col)) {
                    targetEl.classList.add('capture');
                }
            }
        });
    });
}

function clearHighlights() {
    const boards = [boardEl, focusBoard].filter(Boolean);
    boards.forEach(bEl => {
        bEl.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected', 'highlight-move', 'capture'));
    });
}

function makePlayerMove(move) {
    clearHighlights();
    applyMoveAndUpdate(move, 'player');
    if (gameOver) return;
    if (mode === 'ai' && engine.turn === 'b') {
        setTimeout(makeAIMove, 250);
    }
}

function makeAIMove() {
    if (gameOver) return;
    const move = ai.chooseMove(engine);
    if (!move) {
        updateStatus('AI has no moves');
        return;
    }
    applyMoveAndUpdate(move, 'ai');
}

function applyMoveAndUpdate(move, actor) {
    // Track captured piece before applying
    const capturedPiece = engine.getPiece(move.to.row, move.to.col);
    let epCaptured = null;
    if (move.enPassantCapture) {
        const dir = engine.turn === 'w' ? 1 : -1;
        epCaptured = engine.getPiece(move.to.row + dir, move.to.col);
    }
    const taken = capturedPiece || epCaptured;

    engine.applyMove(move);

    if (taken) {
        // The piece was taken by the opponent of the taken piece
        const capturedBy = taken.color === 'w' ? 'b' : 'w';
        capturedPieces[capturedBy].push(taken);
    }

    lastMoveSquares = [engine.coordsToSquare(move.from.row, move.from.col), engine.coordsToSquare(move.to.row, move.to.col)];
    pushMoveToList(move, actor);
    refreshBoard();
    updateStatus();
    switchTimer();
}

function updateStatus(manualText) {
    const state = engine.getGameState();
    const turnLabel = engine.turn === 'w' ? 'White' : 'Black';
    [turnText, focusTurnText].forEach(el => { if (el) el.textContent = turnLabel; });

    if (manualText) {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = manualText; });
        return;
    }

    if (state.status === 'checkmate') {
        const msg = `${state.winner === 'w' ? 'White' : 'Black'} wins by checkmate`;
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = msg; });
        gameOver = true;
        stopTimer();
        if (mode === 'ai' && state.winner === 'w') {
            unlockCount = Math.min(10, unlockCount + 1);
            saveUnlocks();
            renderThemes();
            refreshUnlockDisplay();
        }
        return;
    }

    if (state.status === 'stalemate') {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = 'Draw by stalemate'; });
        gameOver = true;
        stopTimer();
        return;
    }

    if (state.inCheck) {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = `${turnLabel} is in check`; });
    } else {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = 'Game in progress'; });
    }
}

function pushMoveToList(move, actor) {
    const li = document.createElement('li');
    const from = engine.coordsToSquare(move.from.row, move.from.col);
    const to = engine.coordsToSquare(move.to.row, move.to.col);
    let notation = `${from} → ${to}`;
    if (move.castle === 'king') notation = 'O-O';
    if (move.castle === 'queen') notation = 'O-O-O';
    if (move.promotion) notation += ' = Q';
    if (actor === 'ai') notation += ' (AI)';
    li.textContent = notation;

    [moveListEl, focusMoveList].forEach(el => {
        if (!el) return;
        const clone = li.cloneNode(true);
        el.appendChild(clone);
        el.scrollTop = el.scrollHeight;
    });
}

function refreshUnlockDisplay() {
    if (unlockText) {
        unlockText.textContent = `${unlockCount} / 10`;
    }
}

function saveUnlocks() {
    storage.set('aurumUnlocks', String(unlockCount));
}

function loadUnlocks() {
    const stored = storage.get('aurumUnlocks');
    const parsed = stored ? parseInt(stored, 10) : 1;
    return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), 10);
}

function resetTimers() {
    stopTimer();
    timers = { w: timeControl === 'untimed' ? null : Number(timeControl), b: timeControl === 'untimed' ? null : Number(timeControl) };
    updateClockDisplays();
    if (timeControl !== 'untimed') {
        lastTick = performance.now();
        timerInterval = setInterval(tickTimer, 200);
    }
}

function switchTimer() {
    if (timeControl === 'untimed' || gameOver) return;
    lastTick = performance.now();
    if (timers[engine.turn] !== null && timers[engine.turn] <= 0) {
        handleFlagFall(engine.turn);
    }
}

function tickTimer() {
    if (timeControl === 'untimed' || gameOver) return;
    const now = performance.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;
    const color = engine.turn;
    if (timers[color] !== null) {
        timers[color] -= delta;
        if (timers[color] <= 0) {
            timers[color] = 0;
            handleFlagFall(color);
        }
        updateClockDisplays();
    }
}

function handleFlagFall(color) {
    gameOver = true;
    stopTimer();
    const winner = color === 'w' ? 'Black' : 'White';
    const msg = `${winner} wins on time`;
    [statusText, focusStatusText].forEach(el => { if (el) el.textContent = msg; });
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateClockDisplays() {
    if (timeControl === 'untimed') {
        [clockEls.w, focusTimeWhite].forEach(el => { if (el) el.textContent = '--:--'; });
        [clockEls.b, focusTimeBlack].forEach(el => { if (el) el.textContent = '--:--'; });
        return;
    }
    const wt = formatTime(timers.w);
    const bt = formatTime(timers.b);
    [clockEls.w, focusTimeWhite].forEach(el => { if (el) el.textContent = wt; });
    [clockEls.b, focusTimeBlack].forEach(el => { if (el) el.textContent = bt; });
}

function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* ── Captured pieces ── */

const pieceOrder = { q: 0, r: 1, b: 2, n: 3, p: 4 };

function renderCaptured() {
    const sortFn = (a, b) => (pieceOrder[a.type] ?? 9) - (pieceOrder[b.type] ?? 9);

    const renderInto = (el, list) => {
        if (!el) return;
        el.innerHTML = '';
        [...list].sort(sortFn).forEach(p => {
            const span = document.createElement('span');
            span.className = `piece-${p.color}`;
            span.textContent = pieceIcons[`${p.color}${p.type}`];
            el.appendChild(span);
        });
    };

    renderInto(capturedWhiteEl, capturedPieces.w);
    renderInto(capturedBlackEl, capturedPieces.b);
    renderInto(focusCapturedWhite, capturedPieces.w);
    renderInto(focusCapturedBlack, capturedPieces.b);
}

function rebuildCapturedFromHistory() {
    capturedPieces = { w: [], b: [] };
    for (const record of engine.history) {
        const taken = record.capturedPiece || record.enPassantCaptured;
        if (taken) {
            const capturedBy = taken.color === 'w' ? 'b' : 'w';
            capturedPieces[capturedBy].push(taken);
        }
    }
    renderCaptured();
}

/* ── Focus Mode ── */

function toggleFocusMode(on) {
    isFocusMode = on;
    document.body.classList.toggle('focus-active', on);
    if (focusLayout) focusLayout.classList.toggle('active', on);

    if (on) {
        // Sync focus board theme
        if (focusBoardShell) {
            focusBoardShell.className = `board-shell theme-${activeTheme}`;
        }
        refreshBoard();
        updateClockDisplays();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        init();
    } catch (err) {
        console.error('Failed to initialize Aurum Chess', err);
        const fallback = document.getElementById('statusText');
        if (fallback) {
            fallback.textContent = 'Failed to load. Please refresh.';
        }
    }
});
