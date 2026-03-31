import { ChessEngine } from './chessEngine.js';
import { AiPlayer, StockfishClient } from './ai.js';

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
let reviewGameBtn;
let reviewModal;
let reviewBackdrop;
let closeReviewBtn;
let reviewSummaryEl;
let reviewProgressEl;
let reviewListEl;
let resignBtn;
let resignModal;
let resignBackdrop;
let cancelResignBtn;
let confirmResignBtn;

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
let focusPostActions;
let isFocusMode = false;
let toastContainer;
let audioCtx = null;
let lastInCheck = false;

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

const MATCH_SETTINGS_KEY = 'aurumMatchSettings';
const REVIEW_STORAGE_KEY = 'aurumLastReviewGame';

let unlockCount = 1;
let timeControl = 'untimed';
let playerColor = 'random';
let boardOrientation = 'white';
let humanColor = 'w';
let aiColor = 'b';
let timers = { w: null, b: null };
let timerInterval = null;
let lastTick = null;
let gameOver = false;
let gameStarted = false;
let aiMoveToken = 0;
let gameMoves = [];
let gameResultText = '';
let reviewRequestToken = 0;
let dragSourceSquare = null;

const reviewEngine = new StockfishClient();

const themes = [
    { id: 0, name: 'Tournament Green', light: '#d5d5d8', dark: '#6ea043' },
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
    wp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    wn: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    wb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    wr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    wq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    wk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    bp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    bn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    bb: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    br: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    bq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    bk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
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
    reviewGameBtn = document.getElementById('reviewGameBtn');
    reviewModal = document.getElementById('reviewModal');
    reviewBackdrop = document.getElementById('reviewBackdrop');
    closeReviewBtn = document.getElementById('closeReviewBtn');
    reviewSummaryEl = document.getElementById('reviewSummary');
    reviewProgressEl = document.getElementById('reviewProgress');
    reviewListEl = document.getElementById('reviewList');
    resignBtn = document.getElementById('resignBtn');
    resignModal = document.getElementById('resignModal');
    resignBackdrop = document.getElementById('resignBackdrop');
    cancelResignBtn = document.getElementById('cancelResignBtn');
    confirmResignBtn = document.getElementById('confirmResignBtn');
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
    focusPostActions = document.getElementById('focusPostActions');
    toastContainer = document.getElementById('toastContainer');

    unlockCount = loadUnlocks();
    loadMatchSettings();

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
            square.addEventListener('dragover', onSquareDragOver);
            square.addEventListener('dragleave', onSquareDragLeave);
            square.addEventListener('drop', onSquareDrop);
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
            square.addEventListener('dragover', onSquareDragOver);
            square.addEventListener('dragleave', onSquareDragLeave);
            square.addEventListener('drop', onSquareDrop);
            focusBoard.appendChild(square);
        }
    }
}

function bindControls() {
    if (modeAIButton) modeAIButton.addEventListener('click', () => setMode('ai'));
    if (modePvpButton) modePvpButton.addEventListener('click', () => setMode('pvp'));
    document.querySelectorAll('#aiControls .seg').forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameStarted) return;
            document.querySelectorAll('#aiControls .seg').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ai.setDifficulty(btn.dataset.difficulty);
        });
    });

    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameStarted) return;
            timeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            timeControl = btn.dataset.time;
            resetTimers();
        });
    });

    if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
    if (reviewGameBtn) {
        reviewGameBtn.addEventListener('click', () => {
            if (!gameMoves.length) return;
            persistReviewSnapshot();
            window.location.href = 'review.html';
        });
    }
    if (reviewBackdrop) reviewBackdrop.addEventListener('click', closeReviewModal);
    if (closeReviewBtn) closeReviewBtn.addEventListener('click', closeReviewModal);

    if (resignBtn) resignBtn.addEventListener('click', showResignConfirm);
    if (resignBackdrop) resignBackdrop.addEventListener('click', closeResignModal);
    if (cancelResignBtn) cancelResignBtn.addEventListener('click', closeResignModal);
    if (confirmResignBtn) confirmResignBtn.addEventListener('click', confirmResignMatch);

    const exitFocusBtn = document.getElementById('exitFocusBtn');
    if (exitFocusBtn) exitFocusBtn.addEventListener('click', () => toggleFocusMode(false));
    const focusUndoBtn = document.getElementById('focusUndoBtn');
    if (focusUndoBtn) focusUndoBtn.addEventListener('click', () => {
        if (engine.history.length === 0 || gameOver) return;
        aiMoveToken += 1;
        engine.undo();
        if (mode === 'ai' && engine.turn === aiColor && engine.history.length) {
            engine.undo();
        }
        trimMoveHistoryToEngine();
        rebuildCapturedFromHistory();
        refreshBoard();
        updateStatus();
        updateReviewButtonState();
    });
    if (resetProgressBtn) resetProgressBtn.addEventListener('click', () => {
        unlockCount = 1;
        saveUnlocks();
        renderThemes();
        refreshUnlockDisplay();
    });
    if (undoBtn) undoBtn.addEventListener('click', () => {
        if (engine.history.length === 0 || gameOver) return;
        aiMoveToken += 1;
        engine.undo();
        // If undoing after AI moved, undo twice to revert to player turn
        if (mode === 'ai' && engine.turn === aiColor && engine.history.length) {
            engine.undo();
        }
        trimMoveHistoryToEngine();
        rebuildCapturedFromHistory();
        refreshBoard();
        updateStatus();
        updateReviewButtonState();
    });
}

function setMode(nextMode) {
    if (gameStarted) return;
    if (mode === nextMode) return;
    mode = nextMode;
    if (modeAIButton) modeAIButton.classList.toggle('active', nextMode === 'ai');
    if (modePvpButton) modePvpButton.classList.toggle('active', nextMode === 'pvp');
    if (aiControls) aiControls.style.display = nextMode === 'ai' ? 'block' : 'none';
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
        card.classList.toggle('locked-control', gameStarted);
        card.querySelector('.lock').textContent = locked ? 'Locked' : 'Unlocked';
        if (!locked && !gameStarted) {
            card.addEventListener('click', () => selectTheme(theme.id));
        }
        if (activeTheme === theme.id) {
            card.classList.add('active');
        }
        themeGrid.appendChild(card);
    });
}

function selectTheme(id) {
    if (gameStarted) return;
    activeTheme = id;
    document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', Number(c.dataset.theme) === id));
    const themeClass = `board-shell theme-${id}`;
    const shell = document.querySelector('.board-wrapper .board-shell');
    if (shell) shell.className = themeClass;
    if (focusBoardShell) focusBoardShell.className = themeClass;
}

function startNewGame() {
    aiMoveToken += 1;
    reviewRequestToken += 1;
    engine.reset();
    assignSidesForNewGame();
    lastMoveSquares = [];
    selectedSquare = null;
    legalMovesCache = [];
    gameOver = false;
    gameStarted = false;
    gameMoves = [];
    gameResultText = '';
    capturedPieces = { w: [], b: [] };
    if (moveListEl) moveListEl.innerHTML = '';
    if (focusMoveList) focusMoveList.innerHTML = '';
    closeReviewModal();
    closeResignModal();
    setPostMatchActionsVisible(false);
    renderCaptured();
    resetTimers();
    refreshBoard();
    setControlsLocked(false);
    toggleFocusMode(true);
    updateStatus('New game ready');
    updateReviewButtonState();
    if (mode === 'ai' && engine.turn === aiColor) {
        makeAIMove();
    }
}

function assignSidesForNewGame() {
    if (mode !== 'ai') {
        humanColor = 'w';
        aiColor = 'b';
        return;
    }

    if (playerColor === 'white') {
        humanColor = 'w';
        aiColor = 'b';
        return;
    }

    if (playerColor === 'black') {
        humanColor = 'b';
        aiColor = 'w';
        return;
    }

    // Random side assignment in AI mode.
    humanColor = Math.random() < 0.5 ? 'w' : 'b';
    aiColor = humanColor === 'w' ? 'b' : 'w';
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
                const img = document.createElement('img');
                img.className = `piece piece-${piece.color}`;
                img.src = icon;
                img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
                img.draggable = true;
                img.addEventListener('dragstart', onPieceDragStart);
                img.addEventListener('dragend', onPieceDragEnd);
                square.appendChild(img);
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

function canPlayerActOnTurn() {
    if (gameOver) return false;
    if (mode !== 'ai') return true;
    return engine.turn === humanColor;
}

function onSquareClick(square) {
    if (!canPlayerActOnTurn()) return;

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

function onPieceDragStart(event) {
    if (!canPlayerActOnTurn()) {
        event.preventDefault();
        return;
    }

    const squareEl = event.target && event.target.parentElement;
    const fromSquare = squareEl && squareEl.dataset ? squareEl.dataset.square : null;
    if (!fromSquare) {
        event.preventDefault();
        return;
    }

    const { row, col } = engine.squareToCoords(fromSquare);
    const piece = engine.getPiece(row, col);
    if (!piece || piece.color !== engine.turn) {
        event.preventDefault();
        return;
    }

    dragSourceSquare = fromSquare;
    selectedSquare = fromSquare;
    showHighlights(fromSquare);

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', fromSquare);
    }
}

function onPieceDragEnd() {
    dragSourceSquare = null;
    clearDragOverStates();
}

function onSquareDragOver(event) {
    if (!dragSourceSquare || !canPlayerActOnTurn()) return;
    event.preventDefault();

    const targetSquare = event.currentTarget && event.currentTarget.dataset
        ? event.currentTarget.dataset.square
        : null;
    if (!targetSquare) return;

    const hasLegalMove = legalMovesCache.some(
        m => engine.coordsToSquare(m.from.row, m.from.col) === dragSourceSquare
            && engine.coordsToSquare(m.to.row, m.to.col) === targetSquare
    );

    if (hasLegalMove) {
        event.currentTarget.classList.add('drag-over');
    }
}

function onSquareDragLeave(event) {
    if (!event.currentTarget) return;
    event.currentTarget.classList.remove('drag-over');
}

function onSquareDrop(event) {
    if (!dragSourceSquare || !canPlayerActOnTurn()) return;
    event.preventDefault();

    const targetSquare = event.currentTarget && event.currentTarget.dataset
        ? event.currentTarget.dataset.square
        : null;
    const fromSquare = dragSourceSquare;
    dragSourceSquare = null;
    clearDragOverStates();

    if (!targetSquare) return;

    const move = legalMovesCache.find(
        m => engine.coordsToSquare(m.from.row, m.from.col) === fromSquare
            && engine.coordsToSquare(m.to.row, m.to.col) === targetSquare
    );

    if (move) {
        makePlayerMove(move);
    } else {
        clearHighlights();
        selectedSquare = null;
    }
}

function clearDragOverStates() {
    const boards = [boardEl, focusBoard].filter(Boolean);
    boards.forEach(bEl => {
        bEl.querySelectorAll('.square').forEach(sq => sq.classList.remove('drag-over'));
    });
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
        bEl.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected', 'highlight-move', 'capture', 'drag-over'));
    });
}

function makePlayerMove(move) {
    clearHighlights();
    applyMoveAndUpdate(move, 'player');
    if (gameOver) return;
    if (mode === 'ai' && engine.turn === aiColor) {
        setTimeout(makeAIMove, 250);
    }
}

function makeAIMove() {
    if (gameOver) return;
    if (mode !== 'ai' || engine.turn !== aiColor) return;

    const legalMoves = engine.generateLegalMoves(engine.turn);
    if (!legalMoves.length) {
        updateStatus('AI has no moves');
        return;
    }

    const token = ++aiMoveToken;
    const thinkMs = getAiDelay(ai.difficulty || 'easy', legalMoves.length);
    updateStatus('AI thinking...');

    ai.chooseMove(engine, { thinkTimeMs: thinkMs })
        .then(move => {
            if (gameOver || token !== aiMoveToken) return;
            if (!move) {
                updateStatus('AI has no moves');
                return;
            }
            applyMoveAndUpdate(move, 'ai');
        })
        .catch(err => {
            if (token !== aiMoveToken) return;
            console.error('AI move failed', err);
            updateStatus('AI failed to move');
            showToast('AI move failed. Try starting a new game.', 'danger');
        });
}

function applyMoveAndUpdate(move, actor) {
    const moverColor = engine.turn;
    const preFen = engine.getFen();
    const moveNumber = engine.fullmoveNumber;

    // Track captured piece before applying
    const capturedPiece = engine.getPiece(move.to.row, move.to.col);
    let epCaptured = null;
    if (move.enPassantCapture) {
        const dir = engine.turn === 'w' ? 1 : -1;
        epCaptured = engine.getPiece(move.to.row + dir, move.to.col);
    }
    const taken = capturedPiece || epCaptured;

    engine.applyMove(move);
    const postFen = engine.getFen();

    if (!gameStarted) {
        gameStarted = true;
        setControlsLocked(true);
        updateResignButtonState();
    }

    if (taken) {
        // The piece was taken by the opponent of the taken piece
        const capturedBy = taken.color === 'w' ? 'b' : 'w';
        capturedPieces[capturedBy].push(taken);
    }

    lastMoveSquares = [engine.coordsToSquare(move.from.row, move.from.col), engine.coordsToSquare(move.to.row, move.to.col)];
    gameMoves.push({
        move,
        actor,
        moverColor,
        moveNumber,
        preFen,
        postFen,
        notation: formatMoveNotation(move, actor),
        uci: toUciMove(move),
    });
    persistReviewSnapshot();
    pushMoveToList(move, actor);
    refreshBoard();
    updateStatus();

    switchTimer();

    // audio feedback
    if (taken) {
        playSound('capture');
    } else {
        playSound('move');
    }
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
        showToast(msg, 'success');
        playSound('gameover');
        if (mode === 'ai' && state.winner === 'w') {
            unlockCount = Math.min(10, unlockCount + 1);
            saveUnlocks();
            renderThemes();
            refreshUnlockDisplay();
        }
        gameResultText = msg;
        persistReviewSnapshot();
        updateReviewButtonState();
        return;
    }

    if (state.status === 'stalemate') {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = 'Draw by stalemate'; });
        gameOver = true;
        stopTimer();
        showToast('Draw by stalemate', 'info');
        playSound('gameover');
        gameResultText = 'Draw by stalemate';
        persistReviewSnapshot();
        updateReviewButtonState();
        return;
    }

    if (state.inCheck) {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = `${turnLabel} is in check`; });
        if (!lastInCheck) {
            playSound('check');
        }
        lastInCheck = true;
    } else {
        [statusText, focusStatusText].forEach(el => { if (el) el.textContent = 'Game in progress'; });
        lastInCheck = false;
    }
}

function pushMoveToList(move, actor) {
    const li = document.createElement('li');
    const notation = formatMoveNotation(move, actor);
    li.textContent = notation;

    [moveListEl, focusMoveList].forEach(el => {
        if (!el) return;
        const clone = li.cloneNode(true);
        el.appendChild(clone);
        el.scrollTop = el.scrollHeight;
    });
}

function setControlsLocked(locked) {
    const bool = !!locked;
    [modeAIButton, modePvpButton, newGameBtn, resetProgressBtn].forEach(btn => {
        if (btn && btn !== newGameBtn && btn !== resetProgressBtn) {
            btn.disabled = bool;
            btn.classList.toggle('locked-control', bool);
        }
    });
    document.querySelectorAll('#aiControls .seg').forEach(btn => {
        btn.disabled = bool;
        btn.classList.toggle('locked-control', bool);
    });
    timeButtons.forEach(btn => {
        btn.disabled = bool;
        btn.classList.toggle('locked-control', bool);
    });
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('locked-control', bool);
        card.style.pointerEvents = bool ? 'none' : '';
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

function loadMatchSettings() {
    const raw = storage.get(MATCH_SETTINGS_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);
        const nextMode = parsed && parsed.mode === 'pvp' ? 'pvp' : 'ai';
        const nextDifficulty = parsed && ['easy', 'medium', 'hard', 'grandmaster'].includes(parsed.difficulty) ? parsed.difficulty : 'easy';
        const nextTime = parsed && ['untimed', '180', '600'].includes(String(parsed.timeControl)) ? String(parsed.timeControl) : 'untimed';
        const nextPlayerColor = parsed && ['white', 'black', 'random'].includes(parsed.playerColor) ? parsed.playerColor : 'random';
        const requestedTheme = Number(parsed && parsed.theme);

        mode = nextMode;
        timeControl = nextTime;
        playerColor = nextPlayerColor;
        ai.setDifficulty(nextDifficulty);

        // Keep White always at the bottom in all modes.
        boardOrientation = 'white';
        applyBoardOrientation();

        if (modeAIButton) modeAIButton.classList.toggle('active', mode === 'ai');
        if (modePvpButton) modePvpButton.classList.toggle('active', mode === 'pvp');
        if (aiControls) aiControls.style.display = mode === 'ai' ? 'block' : 'none';

        document.querySelectorAll('#aiControls .seg').forEach(btn => {
            const isActive = btn.dataset.difficulty === nextDifficulty;
            btn.classList.toggle('active', isActive);
        });

        timeButtons.forEach(btn => {
            const isActive = btn.dataset.time === timeControl;
            btn.classList.toggle('active', isActive);
        });

        if (Number.isFinite(requestedTheme) && requestedTheme >= 0 && requestedTheme < themes.length && requestedTheme + 1 <= unlockCount) {
            activeTheme = requestedTheme;
        } else {
            activeTheme = 0;
        }
    } catch (_) {
        // ignore malformed saved settings
    }
}

function applyBoardOrientation() {
    const isBlackView = boardOrientation === 'black';
    if (boardEl) {
        boardEl.classList.toggle('flipped', isBlackView);
    }
    if (focusBoard) {
        focusBoard.classList.toggle('flipped', isBlackView);
    }
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
    showToast(msg, 'warn');
    playSound('gameover');
    gameResultText = msg;
    persistReviewSnapshot();
    updateReviewButtonState();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function showResignConfirm() {
    if (gameOver || !gameStarted) return;
    if (resignModal) {
        resignModal.setAttribute('aria-hidden', 'false');
        resignModal.style.display = 'flex';
    }
}

function closeResignModal() {
    if (resignModal) {
        resignModal.setAttribute('aria-hidden', 'true');
        resignModal.style.display = 'none';
    }
}

function confirmResignMatch() {
    closeResignModal();
    gameOver = true;
    stopTimer();
    const lossText = engine.turn === 'w' ? 'Black' : 'White';
    const msg = `${lossText} wins by resignation`;
    [statusText, focusStatusText].forEach(el => { if (el) el.textContent = msg; });
    showToast('Match resigned', 'warn');
    playSound('gameover');
    gameResultText = msg;
    persistReviewSnapshot();
    updateReviewButtonState();
}

function persistReviewSnapshot() {
    if (!gameMoves.length) return;

    const payload = {
        savedAt: Date.now(),
        result: gameResultText || '',
        mode,
        difficulty: ai.difficulty || 'easy',
        timeControl,
        theme: activeTheme,
        humanColor,
        aiColor,
        moves: gameMoves.map(item => ({
            actor: item.actor,
            moverColor: item.moverColor,
            moveNumber: item.moveNumber,
            preFen: item.preFen,
            postFen: item.postFen,
            notation: item.notation,
            uci: item.uci,
        })),
    };

    storage.set(REVIEW_STORAGE_KEY, JSON.stringify(payload));
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

function getAiDelay(difficulty, legalCount) {
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const complexities = clamp(legalCount / 30, 0, 1); // 0 to 1 based on move count

    const ranges = {
        easy: [300, 900],      // casual
        medium: [550, 1300],   // balanced
        hard: [900, 2200],     // deeper search
        grandmaster: [2500, 5500], // strongest practical browser profile
    };
    const [min, max] = ranges[difficulty] || ranges.medium;
    const base = min + Math.random() * (max - min);

    // Add a small complexity bump so busier positions take longer
    const bump = complexities * (
        difficulty === 'grandmaster' ? 1400
            : difficulty === 'hard' ? 600
                : difficulty === 'medium' ? 400
                    : 250
    );
    return Math.floor(base + bump);
}

/* ── Toasts ── */
function showToast(message, variant = 'info') {
    if (!toastContainer) return;
    const div = document.createElement('div');
    div.className = `toast ${variant}`;
    div.textContent = message;
    toastContainer.appendChild(div);
    setTimeout(() => {
        div.remove();
    }, 4000);
}

/* ── Sounds ── */
function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone({ freq = 440, duration = 0.12, volume = 0.15, type = 'sine' }) {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

function playSound(kind) {
    const sounds = {
        move: () => playTone({ freq: 540, duration: 0.09, volume: 0.12, type: 'sine' }),
        capture: () => {
            playTone({ freq: 360, duration: 0.12, volume: 0.16, type: 'square' });
            setTimeout(() => playTone({ freq: 280, duration: 0.08, volume: 0.12, type: 'square' }), 40);
        },
        check: () => playTone({ freq: 880, duration: 0.14, volume: 0.14, type: 'triangle' }),
        gameover: () => {
            playTone({ freq: 240, duration: 0.18, volume: 0.18, type: 'sawtooth' });
            setTimeout(() => playTone({ freq: 180, duration: 0.18, volume: 0.16, type: 'sawtooth' }), 90);
        },
    };
    const fn = sounds[kind];
    if (fn) fn();
}

/* ── Captured pieces ── */

const pieceOrder = { q: 0, r: 1, b: 2, n: 3, p: 4 };

function renderCaptured() {
    const sortFn = (a, b) => (pieceOrder[a.type] ?? 9) - (pieceOrder[b.type] ?? 9);

    const renderInto = (el, list) => {
        if (!el) return;
        el.innerHTML = '';
        [...list].sort(sortFn).forEach(p => {
            const img = document.createElement('img');
            img.className = `captured-piece piece-${p.color}`;
            img.src = pieceIcons[`${p.color}${p.type}`];
            img.alt = `${p.color === 'w' ? 'White' : 'Black'} ${p.type}`;
            img.loading = 'lazy';
            img.decoding = 'async';
            el.appendChild(img);
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

function trimMoveHistoryToEngine() {
    if (gameMoves.length > engine.history.length) {
        gameMoves.length = engine.history.length;
    }
    gameOver = false;
    gameResultText = '';
    reviewRequestToken += 1;
    closeReviewModal();
}

function updateReviewButtonState() {
    if (!reviewGameBtn) return;
    reviewGameBtn.disabled = !gameOver || gameMoves.length === 0;
    setPostMatchActionsVisible(gameOver && gameMoves.length > 0);
    updateResignButtonState();
}

function updateResignButtonState() {
    if (!resignBtn) return;
    resignBtn.disabled = gameOver || !gameStarted;
}

function setPostMatchActionsVisible(visible) {
    if (!focusPostActions) return;
    focusPostActions.classList.toggle('visible', !!visible);
}

function openReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.add('active');
    reviewModal.setAttribute('aria-hidden', 'false');
}

function closeReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.remove('active');
    reviewModal.setAttribute('aria-hidden', 'true');
}

function launchGameReview(autoOpen) {
    if (!gameOver || !gameMoves.length) return;

    const token = ++reviewRequestToken;
    if (autoOpen) {
        openReviewModal();
    }

    if (reviewSummaryEl) {
        reviewSummaryEl.textContent = gameResultText || 'Game complete';
    }
    if (reviewProgressEl) {
        reviewProgressEl.textContent = 'Analyzing moves with Stockfish...';
    }
    if (reviewListEl) {
        reviewListEl.innerHTML = '';
    }

    analyzeCompletedGame(gameMoves.slice(), token)
        .then(report => {
            if (token !== reviewRequestToken) return;
            renderReviewReport(report);
        })
        .catch(err => {
            if (token !== reviewRequestToken) return;
            console.error('Review failed', err);
            runFallbackReview(gameMoves.slice(), token, err);
        });
}

async function analyzeCompletedGame(moves, token) {
    try {
        return await analyzeCompletedGameWithStockfish(moves, token);
    } catch (error) {
        console.warn('Stockfish review unavailable; using fallback reviewer.', error);
        return analyzeCompletedGameFallback(moves, token);
    }
}

async function analyzeCompletedGameWithStockfish(moves, token) {
    const report = [];
    let whiteCplTotal = 0;
    let blackCplTotal = 0;
    let whiteCount = 0;
    let blackCount = 0;

    for (let i = 0; i < moves.length; i++) {
        if (token !== reviewRequestToken) {
            throw new Error('Review cancelled');
        }
        const item = moves[i];
        if (reviewProgressEl) {
            reviewProgressEl.textContent = `Analyzing move ${i + 1} / ${moves.length}...`;
        }

        const pre = await reviewEngine.analyzePosition(item.preFen, { moveTimeMs: 180, skillLevel: 20 });
        const post = await reviewEngine.analyzePosition(item.postFen, { moveTimeMs: 180, skillLevel: 20 });

        const bestScore = Number(pre.scoreCp) || 0;
        const playedScore = -((Number(post.scoreCp) || 0));
        const cpLossRaw = bestScore - playedScore;
        const cpLoss = Math.max(0, Math.min(2000, Math.round(cpLossRaw)));
        const bestUci = pre.bestMove || '';
        const isBest = bestUci && bestUci === item.uci;
        const verdict = classifyMove(cpLoss, isBest);

        if (item.moverColor === 'w') {
            whiteCplTotal += cpLoss;
            whiteCount += 1;
        } else {
            blackCplTotal += cpLoss;
            blackCount += 1;
        }

        report.push({
            ply: i + 1,
            moveNumber: item.moveNumber,
            moverColor: item.moverColor,
            notation: item.notation,
            playedUci: item.uci,
            bestUci,
            cpLoss,
            verdict,
            bestScore,
            playedScore,
        });
    }

    return {
        rows: report,
        avgCplWhite: whiteCount ? Math.round(whiteCplTotal / whiteCount) : 0,
        avgCplBlack: blackCount ? Math.round(blackCplTotal / blackCount) : 0,
        movesAnalyzed: report.length,
        engineSource: 'Stockfish',
    };
}

function analyzeCompletedGameFallback(moves, token) {
    const sim = new ChessEngine();
    const report = [];
    let whiteCplTotal = 0;
    let blackCplTotal = 0;
    let whiteCount = 0;
    let blackCount = 0;

    for (let i = 0; i < moves.length; i++) {
        if (token !== reviewRequestToken) {
            throw new Error('Review cancelled');
        }

        const item = moves[i];
        if (reviewProgressEl) {
            reviewProgressEl.textContent = `Fallback analysis ${i + 1} / ${moves.length}...`;
        }

        const legal = sim.generateLegalMoves(sim.turn);
        if (!legal.length) break;

        const playedMove = legal.find(m => toUciMoveFromEngineMove(sim, m) === item.uci) || legal[0];
        const bestMove = ai.pickShallow(sim, legal, sim.turn, 2) || legal[0];

        const moverColor = sim.turn;
        const bestScore = evaluateMoveScore(sim, bestMove, moverColor);
        const playedScore = evaluateMoveScore(sim, playedMove, moverColor);
        const cpLoss = Math.max(0, Math.min(2000, Math.round(bestScore - playedScore)));

        const bestUci = toUciMoveFromEngineMove(sim, bestMove);
        const playedUci = toUciMoveFromEngineMove(sim, playedMove);
        const isBest = bestUci === playedUci;
        const verdict = classifyMove(cpLoss, isBest);

        if (moverColor === 'w') {
            whiteCplTotal += cpLoss;
            whiteCount += 1;
        } else {
            blackCplTotal += cpLoss;
            blackCount += 1;
        }

        report.push({
            ply: i + 1,
            moveNumber: item.moveNumber,
            moverColor,
            notation: item.notation,
            playedUci,
            bestUci,
            cpLoss,
            verdict,
            bestScore,
            playedScore,
        });

        sim.applyMove(playedMove);
    }

    return {
        rows: report,
        avgCplWhite: whiteCount ? Math.round(whiteCplTotal / whiteCount) : 0,
        avgCplBlack: blackCount ? Math.round(blackCplTotal / blackCount) : 0,
        movesAnalyzed: report.length,
        engineSource: 'Fallback',
    };
}

function evaluateMoveScore(simEngine, move, perspective) {
    simEngine.applyMove(move);
    const score = ai.evaluateBoard(simEngine, perspective);
    simEngine.undo();
    return score;
}

function toUciMoveFromEngineMove(simEngine, move) {
    const from = simEngine.coordsToSquare(move.from.row, move.from.col);
    const to = simEngine.coordsToSquare(move.to.row, move.to.col);
    const promo = move.promotion ? String(move.promotion).toLowerCase() : '';
    return `${from}${to}${promo}`;
}

function runFallbackReview(moves, token, rootError) {
    try {
        const fallbackReport = analyzeCompletedGameFallback(moves, token);
        if (token !== reviewRequestToken) return;
        renderReviewReport(fallbackReport);
        showToast('Stockfish unavailable: showing fallback review.', 'warn');
    } catch (fallbackError) {
        console.error('Fallback review failed', rootError, fallbackError);
        if (reviewProgressEl) {
            reviewProgressEl.textContent = 'Review failed to run. Please try a new match and review again.';
        }
    }
}

function classifyMove(cpLoss, isBest) {
    if (isBest || cpLoss <= 15) {
        return { key: 'best', icon: '★', label: 'Best Move' };
    }
    if (cpLoss <= 35) {
        return { key: 'excellent', icon: '!!', label: 'Excellent' };
    }
    if (cpLoss <= 80) {
        return { key: 'good', icon: '!', label: 'Good' };
    }
    if (cpLoss <= 150) {
        return { key: 'inaccuracy', icon: '?!', label: 'Inaccuracy' };
    }
    if (cpLoss <= 300) {
        return { key: 'mistake', icon: '?', label: 'Mistake' };
    }
    return { key: 'blunder', icon: '??', label: 'Blunder' };
}

function renderReviewReport(report) {
    if (!reviewListEl || !reviewProgressEl || !reviewSummaryEl) return;

    const headerBits = [];
    if (gameResultText) headerBits.push(gameResultText);
    if (report.engineSource) headerBits.push(`Engine: ${report.engineSource}`);
    headerBits.push(`Moves analyzed: ${report.movesAnalyzed}`);
    headerBits.push(`Avg CPL White: ${report.avgCplWhite}`);
    headerBits.push(`Avg CPL Black: ${report.avgCplBlack}`);
    reviewSummaryEl.textContent = headerBits.join(' | ');

    reviewListEl.innerHTML = '';
    report.rows.forEach(row => {
        const li = document.createElement('li');
        li.className = `review-item ${row.verdict.key}`;

        const top = document.createElement('div');
        top.className = 'review-item-top';

        const moveLabel = document.createElement('span');
        const side = row.moverColor === 'w' ? 'White' : 'Black';
        moveLabel.className = 'review-move';
        moveLabel.textContent = `${row.moveNumber}${row.moverColor === 'w' ? '.' : '...'} ${row.notation} (${side})`;

        const badge = document.createElement('span');
        badge.className = `review-badge ${row.verdict.key}`;
        badge.textContent = `${row.verdict.icon} ${row.verdict.label}`;

        top.appendChild(moveLabel);
        top.appendChild(badge);
        li.appendChild(top);

        const detail = document.createElement('p');
        detail.className = 'review-detail';
        detail.textContent = `CPL ${row.cpLoss} | Eval ${formatEvalCp(row.playedScore)} (best ${formatEvalCp(row.bestScore)})`;
        li.appendChild(detail);

        if (row.bestUci && row.bestUci !== row.playedUci) {
            const hint = document.createElement('p');
            hint.className = 'review-best-hint';
            hint.textContent = `Best move: ${formatUciMove(row.bestUci)} | Played: ${formatUciMove(row.playedUci)}`;
            li.appendChild(hint);
        }

        reviewListEl.appendChild(li);
    });

    reviewProgressEl.textContent = 'Analysis complete.';
}

function formatEvalCp(cp) {
    const value = Number(cp) || 0;
    const pawns = value / 100;
    const sign = pawns > 0 ? '+' : '';
    return `${sign}${pawns.toFixed(2)}`;
}

function toUciMove(move) {
    const from = engine.coordsToSquare(move.from.row, move.from.col);
    const to = engine.coordsToSquare(move.to.row, move.to.col);
    const promo = move.promotion ? String(move.promotion).toLowerCase() : '';
    return `${from}${to}${promo}`;
}

function formatUciMove(uci) {
    if (!uci || uci.length < 4) return 'n/a';
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4] ? `=${uci[4].toUpperCase()}` : '';
    return `${from} → ${to}${promo}`;
}

function formatMoveNotation(move, actor) {
    const from = engine.coordsToSquare(move.from.row, move.from.col);
    const to = engine.coordsToSquare(move.to.row, move.to.col);
    let notation = `${from} → ${to}`;
    if (move.castle === 'king') notation = 'O-O';
    if (move.castle === 'queen') notation = 'O-O-O';
    if (move.promotion) notation += ' = Q';
    if (actor === 'ai') notation += ' (AI)';
    return notation;
}

/* ── Focus Mode ── */

function toggleFocusMode(on) {
    if (!on) {
        window.location.href = 'index.html';
        return;
    }

    isFocusMode = on;
    document.body.classList.toggle('focus-active', on);
    if (focusLayout) focusLayout.classList.toggle('active', on);

    // Sync focus board theme
    if (focusBoardShell) {
        focusBoardShell.className = `board-shell theme-${activeTheme}`;
    }
    refreshBoard();
    updateClockDisplays();
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
