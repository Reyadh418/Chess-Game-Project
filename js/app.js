import { ChessEngine } from './chessEngine.js';
import { AiPlayer } from './ai.js';

const boardEl = document.getElementById('board');
const statusText = document.getElementById('statusText');
const turnText = document.getElementById('turnText');
const unlockText = document.getElementById('unlockText');
const moveListEl = document.getElementById('moveList');
const modeAIButton = document.getElementById('modeAI');
const modePvpButton = document.getElementById('modePvp');
const aiControls = document.getElementById('aiControls');
const timeButtons = document.querySelectorAll('#timeControls .chip');
const newGameBtn = document.getElementById('newGameBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const undoBtn = document.getElementById('undoBtn');
const themeGrid = document.getElementById('themeGrid');
const themeTemplate = document.getElementById('themeCardTemplate');
const clockEls = {
    w: document.getElementById('timeWhite'),
    b: document.getElementById('timeBlack'),
};

let engine = new ChessEngine();
let ai = new AiPlayer('easy');
let mode = 'ai';
let selectedSquare = null;
let legalMovesCache = [];
let lastMoveSquares = [];
let activeTheme = 0;
let unlockCount = loadUnlocks();
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
    buildBoard();
    bindControls();
    renderThemes();
    selectTheme(activeTheme);
    refreshUnlockDisplay();
    startNewGame();
}

function buildBoard() {
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
        });
    });

    newGameBtn.addEventListener('click', startNewGame);
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
        refreshBoard();
        updateStatus();
    });
}

function setMode(nextMode) {
    mode = nextMode;
    modeAIButton.classList.toggle('active', nextMode === 'ai');
    modePvpButton.classList.toggle('active', nextMode === 'pvp');
    aiControls.style.display = nextMode === 'ai' ? 'block' : 'none';
}

function renderThemes() {
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
    document.querySelector('.board-shell').className = `board-shell theme-${id}`;
}

function startNewGame() {
    engine.reset();
    lastMoveSquares = [];
    selectedSquare = null;
    legalMovesCache = [];
    gameOver = false;
    moveListEl.innerHTML = '';
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
    boardEl.querySelectorAll('.square').forEach(square => {
        const algebraic = square.dataset.square;
        const { row, col } = engine.squareToCoords(algebraic);
        const piece = snapshot[row][col];
        square.innerHTML = '';
        square.classList.remove('selected', 'highlight-move', 'capture', 'last-move', 'in-check');

        if (piece) {
            const icon = pieceIcons[`${piece.color}${piece.type}`];
            const span = document.createElement('span');
            span.className = 'piece';
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
        const el = boardEl.querySelector(`[data-square="${sq}"]`);
        if (el) el.classList.add('in-check');
    }
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
    const squareEl = boardEl.querySelector(`[data-square="${square}"]`);
    if (squareEl) squareEl.classList.add('selected');
    moves.forEach(m => {
        const target = engine.coordsToSquare(m.to.row, m.to.col);
        const targetEl = boardEl.querySelector(`[data-square="${target}"]`);
        if (targetEl) {
            targetEl.classList.add('highlight-move');
            if (engine.getPiece(m.to.row, m.to.col)) {
                targetEl.classList.add('capture');
            }
        }
    });
}

function clearHighlights() {
    boardEl.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected', 'highlight-move', 'capture'));
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
    engine.applyMove(move);
    lastMoveSquares = [engine.coordsToSquare(move.from.row, move.from.col), engine.coordsToSquare(move.to.row, move.to.col)];
    pushMoveToList(move, actor);
    refreshBoard();
    updateStatus();
    switchTimer();
}

function updateStatus(manualText) {
    const state = engine.getGameState();
    const turnLabel = engine.turn === 'w' ? 'White' : 'Black';
    turnText.textContent = turnLabel;

    if (manualText) {
        statusText.textContent = manualText;
        return;
    }

    if (state.status === 'checkmate') {
        statusText.textContent = `${state.winner === 'w' ? 'White' : 'Black'} wins by checkmate`;
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
        statusText.textContent = 'Draw by stalemate';
        gameOver = true;
        stopTimer();
        return;
    }

    if (state.inCheck) {
        statusText.textContent = `${turnLabel} is in check`;
    } else {
        statusText.textContent = 'Game in progress';
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
    moveListEl.appendChild(li);
    moveListEl.scrollTop = moveListEl.scrollHeight;
}

function refreshUnlockDisplay() {
    unlockText.textContent = `${unlockCount} / 10`;
}

function saveUnlocks() {
    localStorage.setItem('aurumUnlocks', String(unlockCount));
}

function loadUnlocks() {
    const stored = localStorage.getItem('aurumUnlocks');
    const parsed = stored ? parseInt(stored, 10) : 1;
    return Math.min(Math.max(parsed || 1, 1), 10);
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
    statusText.textContent = `${winner} wins on time`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateClockDisplays() {
    if (timeControl === 'untimed') {
        clockEls.w.textContent = '--:--';
        clockEls.b.textContent = '--:--';
        return;
    }
    clockEls.w.textContent = formatTime(timers.w);
    clockEls.b.textContent = formatTime(timers.b);
}

function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

init();
