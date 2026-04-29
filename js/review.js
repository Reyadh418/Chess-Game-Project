import { ChessEngine } from './chessEngine.js';

const REVIEW_STORAGE_KEY = 'aurumLastReviewGame';

const themes = [
    { id: 0, name: 'Tournament Green' },
    { id: 1, name: 'Amberwood' },
    { id: 2, name: 'Mint Crest' },
    { id: 3, name: 'Blush Silk' },
    { id: 4, name: 'Polar Sky' },
    { id: 5, name: 'Violet Crown' },
    { id: 6, name: 'Glacier Fade' },
    { id: 7, name: 'Champagne' },
    { id: 8, name: 'Garden Glass' },
    { id: 9, name: 'Frosted Slate' },
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

const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    },
};

let boardEl;
let boardShellEl;
let reviewResultEl;
let reviewProgressTextEl;
let reviewMetaEl;
let reviewMoveListEl;
let reviewEmptyEl;
let controlsWrapEl;
let firstMoveBtn;
let prevMoveBtn;
let playPauseBtn;
let nextMoveBtn;
let lastMoveBtn;
let backToMatchBtn;

let engine = new ChessEngine();
let reviewData = null;
let moves = [];
let currentPly = 0;
let autoplayTimer = null;
let resizeRaf = 0;

function init() {
    boardEl = document.getElementById('reviewBoard');
    boardShellEl = document.getElementById('reviewBoardShell');
    reviewResultEl = document.getElementById('reviewResult');
    reviewProgressTextEl = document.getElementById('reviewProgressText');
    reviewMetaEl = document.getElementById('reviewMeta');
    reviewMoveListEl = document.getElementById('reviewMoveList');
    reviewEmptyEl = document.getElementById('reviewEmpty');
    controlsWrapEl = document.getElementById('reviewControls');
    firstMoveBtn = document.getElementById('firstMoveBtn');
    prevMoveBtn = document.getElementById('prevMoveBtn');
    playPauseBtn = document.getElementById('playPauseBtn');
    nextMoveBtn = document.getElementById('nextMoveBtn');
    lastMoveBtn = document.getElementById('lastMoveBtn');
    backToMatchBtn = document.getElementById('backToMatchBtn');

    buildBoard();
    bindControls();
    loadReviewData();
    renderAll();
    scheduleBoardResize();
    window.addEventListener('resize', scheduleBoardResize);
}

function bindControls() {
    if (backToMatchBtn) {
        backToMatchBtn.addEventListener('click', () => {
            window.location.href = 'focus.html';
        });
    }

    if (firstMoveBtn) firstMoveBtn.addEventListener('click', () => jumpToPly(0));
    if (prevMoveBtn) prevMoveBtn.addEventListener('click', () => jumpToPly(currentPly - 1));
    if (nextMoveBtn) nextMoveBtn.addEventListener('click', () => jumpToPly(currentPly + 1));
    if (lastMoveBtn) lastMoveBtn.addEventListener('click', () => jumpToPly(moves.length));
    if (playPauseBtn) playPauseBtn.addEventListener('click', toggleAutoplay);

    window.addEventListener('keydown', event => {
        if (!moves.length) return;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            jumpToPly(currentPly - 1);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            jumpToPly(currentPly + 1);
        }
    });
}

function loadReviewData() {
    const raw = storage.get(REVIEW_STORAGE_KEY);
    if (!raw) {
        reviewData = null;
        moves = [];
        currentPly = 0;
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        const parsedMoves = Array.isArray(parsed && parsed.moves) ? parsed.moves : [];
        reviewData = parsed;
        moves = parsedMoves;
        currentPly = 0;
    } catch (_) {
        reviewData = null;
        moves = [];
        currentPly = 0;
    }
}

function scheduleBoardResize() {
    if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
    }
    resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        syncReviewBoardSize();
    });
}

function syncReviewBoardSize() {
    if (!boardShellEl) return;
    const area = boardShellEl.parentElement;
    if (!area) return;

    const areaStyle = getComputedStyle(area);
    const paddingX = parseFloat(areaStyle.paddingLeft) + parseFloat(areaStyle.paddingRight);
    const paddingY = parseFloat(areaStyle.paddingTop) + parseFloat(areaStyle.paddingBottom);
    const rowGap = parseFloat(areaStyle.rowGap) || parseFloat(areaStyle.gap) || 0;
    const areaWidth = area.clientWidth - paddingX;
    const areaHeight = area.clientHeight - paddingY;

    const children = Array.from(area.children);
    const visibleChildren = children.filter(child => child.offsetParent !== null);
    const usedHeight = visibleChildren
        .filter(child => child !== boardShellEl)
        .reduce((sum, child) => sum + child.offsetHeight, 0);
    const gapCount = Math.max(0, visibleChildren.length - 1);
    const availableHeight = areaHeight - usedHeight - rowGap * gapCount;
    const size = Math.max(0, Math.min(areaWidth, availableHeight));

    if (!Number.isFinite(size) || size <= 0) return;
    boardShellEl.style.width = `${size}px`;
    boardShellEl.style.height = `${size}px`;
}

function buildBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.square = engine.coordsToSquare(row, col);
            boardEl.appendChild(square);
        }
    }
}

function renderAll() {
    applyTheme();
    renderMeta();
    renderMoveList();
    jumpToPly(currentPly);
}

function applyTheme() {
    if (!boardShellEl) return;
    const requested = Number(reviewData && reviewData.theme);
    const safeTheme = Number.isFinite(requested) && requested >= 0 && requested < themes.length ? requested : 0;
    boardShellEl.className = `board-shell theme-${safeTheme}`;
}

function renderMeta() {
    if (!reviewMetaEl || !reviewResultEl) return;
    if (!reviewData || !moves.length) {
        reviewResultEl.textContent = 'No reviewed game found.';
        reviewMetaEl.innerHTML = '';
        return;
    }

    const result = reviewData.result || 'Game complete';
    const modeText = reviewData.mode === 'pvp' ? 'Pass & Play' : 'Player vs AI';
    const difficultyText = String(reviewData.difficulty || 'easy');
    const timeText = String(reviewData.timeControl || 'untimed');
    const saved = reviewData.savedAt ? new Date(reviewData.savedAt).toLocaleString() : 'Unknown';

    reviewResultEl.textContent = result;
    reviewMetaEl.innerHTML = [
        `<p><span>Mode</span><strong>${modeText}</strong></p>`,
        `<p><span>Difficulty</span><strong>${capitalize(difficultyText)}</strong></p>`,
        `<p><span>Time</span><strong>${formatTimeControl(timeText)}</strong></p>`,
        `<p><span>Saved</span><strong>${saved}</strong></p>`,
    ].join('');
}

function renderMoveList() {
    if (!reviewMoveListEl || !reviewEmptyEl || !controlsWrapEl) return;

    reviewMoveListEl.innerHTML = '';

    if (!moves.length) {
        reviewEmptyEl.style.display = 'block';
        controlsWrapEl.style.display = 'none';
        scheduleBoardResize();
        return;
    }

    reviewEmptyEl.style.display = 'none';
    controlsWrapEl.style.display = 'grid';

    moves.forEach((move, index) => {
        const li = document.createElement('li');
        li.className = 'review-nav-move';
        li.dataset.ply = String(index + 1);

        const prefix = move.moverColor === 'w' ? `${move.moveNumber}.` : `${move.moveNumber}...`;
        li.textContent = `${prefix} ${move.notation}`;

        li.addEventListener('click', () => jumpToPly(index + 1));
        reviewMoveListEl.appendChild(li);
    });

    scheduleBoardResize();
}

function jumpToPly(nextPly) {
    const clamped = Math.max(0, Math.min(Number(nextPly) || 0, moves.length));
    currentPly = clamped;

    engine.reset();
    let applied = 0;

    for (let i = 0; i < currentPly; i++) {
        const ok = applyUciMove(engine, moves[i].uci);
        if (!ok) break;
        applied += 1;
    }

    if (applied !== currentPly) {
        currentPly = applied;
    }

    renderBoard();
    renderMoveSelection();
    updateProgress();
    updateControlStates();

    if (autoplayTimer && currentPly >= moves.length) {
        stopAutoplay();
    }
}

function renderBoard() {
    if (!boardEl) return;
    const snapshot = engine.getBoardSnapshot();

    boardEl.querySelectorAll('.square').forEach(square => {
        const algebraic = square.dataset.square;
        const { row, col } = engine.squareToCoords(algebraic);
        const piece = snapshot[row][col];
        square.innerHTML = '';

        if (!piece) return;

        const img = document.createElement('img');
        img.className = `piece piece-${piece.color}`;
        img.src = pieceIcons[`${piece.color}${piece.type}`];
        img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
        img.draggable = false;
        square.appendChild(img);
    });
}

function renderMoveSelection() {
    if (!reviewMoveListEl) return;
    reviewMoveListEl.querySelectorAll('.review-nav-move').forEach(item => {
        const ply = Number(item.dataset.ply);
        item.classList.toggle('active', ply === currentPly);
    });

    const active = reviewMoveListEl.querySelector('.review-nav-move.active');
    if (active) {
        active.scrollIntoView({ block: 'nearest' });
    }
}

function updateProgress() {
    if (!reviewProgressTextEl) return;
    const turn = engine.turn === 'w' ? 'White' : 'Black';
    reviewProgressTextEl.textContent = `Move ${currentPly} / ${moves.length} | Turn: ${turn}`;
}

function updateControlStates() {
    const hasMoves = moves.length > 0;
    if (firstMoveBtn) firstMoveBtn.disabled = !hasMoves || currentPly <= 0;
    if (prevMoveBtn) prevMoveBtn.disabled = !hasMoves || currentPly <= 0;
    if (nextMoveBtn) nextMoveBtn.disabled = !hasMoves || currentPly >= moves.length;
    if (lastMoveBtn) lastMoveBtn.disabled = !hasMoves || currentPly >= moves.length;
    if (playPauseBtn) playPauseBtn.disabled = !hasMoves;
}

function applyUciMove(simEngine, uci) {
    if (!uci || uci.length < 4) return false;

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] ? uci[4].toLowerCase() : null;

    const legal = simEngine.generateLegalMoves(simEngine.turn);
    const found = legal.find(move => {
        const fromSq = simEngine.coordsToSquare(move.from.row, move.from.col);
        const toSq = simEngine.coordsToSquare(move.to.row, move.to.col);
        if (fromSq !== from || toSq !== to) return false;
        if (promotion) {
            return (move.promotion || '').toLowerCase() === promotion;
        }
        return true;
    });

    if (!found) return false;
    simEngine.applyMove(found);
    return true;
}

function toggleAutoplay() {
    if (autoplayTimer) {
        stopAutoplay();
        return;
    }

    if (!moves.length) return;
    if (currentPly >= moves.length) {
        jumpToPly(0);
    }

    autoplayTimer = setInterval(() => {
        if (currentPly >= moves.length) {
            stopAutoplay();
            return;
        }
        jumpToPly(currentPly + 1);
    }, 800);

    if (playPauseBtn) {
        playPauseBtn.textContent = 'Pause';
    }
}

function stopAutoplay() {
    if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
    }
    if (playPauseBtn) {
        playPauseBtn.textContent = 'Play';
    }
}

function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTimeControl(value) {
    if (value === 'untimed') return 'No clock';
    if (value === '180') return '3:00';
    if (value === '600') return '10:00';
    return value;
}

window.addEventListener('DOMContentLoaded', init);
