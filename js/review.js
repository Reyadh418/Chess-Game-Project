import { ChessEngine } from './chessEngine.js';
import { StockfishClient } from './ai.js';

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

const reviewEngine = new StockfishClient();
const reviewPieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

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
let boardRowEl;
let arrowCanvasEl;
let evalRailEl;
let evalBarEl;
let evalFillEl;
let evalMarkerEl;
let evalScoreEl;
let evalGraphEl;
let engineStatusEl;
let bestLineEl;
let altLineEl;
let depthTextEl;
let evalTextEl;
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
let displayPly = 0;
let previewPly = null;
let autoplayTimer = null;
let resizeRaf = 0;
let analysisToken = 0;
let analysisStatus = '';
let analysisResults = new Map();
let evalSeries = [];
let arrowScale = 1;
let evalGraphScale = 1;
let evalGraphSize = { width: 0, height: 0 };

function init() {
    boardEl = document.getElementById('reviewBoard');
    boardShellEl = document.getElementById('reviewBoardShell');
    boardRowEl = document.getElementById('reviewBoardRow');
    arrowCanvasEl = document.getElementById('reviewArrowCanvas');
    evalRailEl = document.getElementById('reviewEvalRail');
    evalBarEl = document.getElementById('reviewEvalBar');
    evalFillEl = document.getElementById('reviewEvalFill');
    evalMarkerEl = document.getElementById('reviewEvalMarker');
    evalScoreEl = document.getElementById('reviewEvalScore');
    evalGraphEl = document.getElementById('reviewEvalGraph');
    engineStatusEl = document.getElementById('reviewEngineStatus');
    bestLineEl = document.getElementById('reviewBestLine');
    altLineEl = document.getElementById('reviewAltLine');
    depthTextEl = document.getElementById('reviewDepthText');
    evalTextEl = document.getElementById('reviewEvalText');
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
    startReviewAnalysis();
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
        displayPly = 0;
        previewPly = null;
        evalSeries = [];
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        const parsedMoves = Array.isArray(parsed && parsed.moves) ? parsed.moves : [];
        reviewData = parsed;
        moves = parsedMoves;
        currentPly = 0;
        displayPly = 0;
        previewPly = null;
        evalSeries = new Array(parsedMoves.length + 1).fill(0);
    } catch (_) {
        reviewData = null;
        moves = [];
        currentPly = 0;
        displayPly = 0;
        previewPly = null;
        evalSeries = [];
    }
}

function scheduleBoardResize() {
    if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
    }
    resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        syncReviewBoardSize();
        resizeEvalGraph();
        redrawBoardOverlays();
    });
}

function syncReviewBoardSize() {
    if (!boardShellEl || !boardRowEl) return;
    const area = boardShellEl.closest('.review-board-area');
    if (!area) return;

    const areaStyle = getComputedStyle(area);
    const paddingY = parseFloat(areaStyle.paddingTop) + parseFloat(areaStyle.paddingBottom);
    const rowGap = parseFloat(areaStyle.rowGap) || parseFloat(areaStyle.gap) || 0;
    const areaHeight = area.clientHeight - paddingY;

    const children = Array.from(area.children);
    const visibleChildren = children.filter(child => child.offsetParent !== null);
    const usedHeight = visibleChildren
        .filter(child => child !== boardRowEl)
        .reduce((sum, child) => sum + child.offsetHeight, 0);
    const gapCount = Math.max(0, visibleChildren.length - 1);
    const availableHeight = areaHeight - usedHeight - rowGap * gapCount;

    const rowStyle = getComputedStyle(boardRowEl);
    const rowPaddingX = parseFloat(rowStyle.paddingLeft) + parseFloat(rowStyle.paddingRight);
    const colGap = parseFloat(rowStyle.columnGap) || parseFloat(rowStyle.gap) || 0;
    let evalWidth = 0;
    if (evalRailEl) {
        const evalRect = evalRailEl.getBoundingClientRect();
        const shellRect = boardShellEl.getBoundingClientRect();
        const sameRow = Math.abs(evalRect.top - shellRect.top) < 4;
        evalWidth = sameRow ? evalRailEl.offsetWidth : 0;
    }
    const gap = evalWidth ? colGap : 0;
    const availableWidth = boardRowEl.clientWidth - rowPaddingX - evalWidth - gap;

    const size = Math.max(0, Math.min(availableWidth, availableHeight));
    if (!Number.isFinite(size) || size <= 0) return;
    boardShellEl.style.width = `${size}px`;
    boardShellEl.style.height = `${size}px`;
    syncArrowCanvas(size);
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
    updateEvalUI();
    renderEnginePanel();
    resizeEvalGraph();
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
        const top = document.createElement('div');
        top.className = 'review-nav-top';

        const text = document.createElement('span');
        text.className = 'review-nav-text';
        text.textContent = `${prefix} ${move.notation}`;

        const badge = document.createElement('span');
        badge.className = 'review-badge review-badge-compact';
        badge.hidden = true;

        top.appendChild(text);
        top.appendChild(badge);
        li.appendChild(top);

        const cached = analysisResults.get(index + 1);
        if (cached) {
            applyBadgeToMove(li, cached);
        }

        li.addEventListener('click', () => jumpToPly(index + 1));
        li.addEventListener('mouseenter', () => previewMove(index + 1));
        li.addEventListener('mouseleave', clearPreview);
        reviewMoveListEl.appendChild(li);
    });

    scheduleBoardResize();
}

function setAnalysisStatus(status) {
    analysisStatus = status || '';
    if (engineStatusEl) {
        engineStatusEl.textContent = status || 'Waiting';
    }
    updateProgress();
}

async function startReviewAnalysis() {
    if (!moves.length) {
        setAnalysisStatus('');
        return;
    }

    const token = ++analysisToken;
    analysisResults = new Map();
    evalSeries = new Array(moves.length + 1).fill(0);
    setAnalysisStatus('Stockfish: initializing');

    try {
        await reviewEngine.init();
    } catch (error) {
        console.warn('Stockfish unavailable for review analysis.', error);
        setAnalysisStatus('Stockfish unavailable');
        return;
    }

    for (let i = 0; i < moves.length; i++) {
        if (token !== analysisToken) return;
        setAnalysisStatus(`Stockfish analyzing ${i + 1}/${moves.length}`);
        const item = moves[i];

        const pre = await reviewEngine.analyzePosition(item.preFen, { moveTimeMs: 650, skillLevel: 20, multiPv: 2 });
        const post = await reviewEngine.analyzePosition(item.postFen, { moveTimeMs: 550, skillLevel: 20, multiPv: 1 });

        const bestScore = Number(pre.scoreCp) || 0;
        const playedScore = -((Number(post.scoreCp) || 0));
        const cpLossRaw = bestScore - playedScore;
        const cpLoss = Math.max(0, Math.min(2000, Math.round(cpLossRaw)));

        const bestUci = pre.bestMove || '';
        const isBest = bestUci && bestUci === item.uci;
        const bestGap = getBestGap(pre);
        const materialDelta = getMaterialDelta(item.preFen, item.postFen, item.moverColor);
        const verdict = classifyMove({ cpLoss, isBest, bestGap, materialDelta, bestScore, playedScore });
        const evalWhite = evalForWhite(post.scoreCp, item.postFen);
        const bestEvalWhite = evalForWhite(pre.scoreCp, item.preFen);
        const bestLine = getLineMoves(pre, 0);
        const altLine = getLineMoves(pre, 1);
        const depth = getLineDepth(pre);

        const row = {
            ply: i + 1,
            verdict,
            cpLoss,
            bestUci,
            playedUci: item.uci,
            evalWhite,
            bestEvalWhite,
            bestLine,
            altLine,
            depth,
        };
        analysisResults.set(i + 1, row);
        evalSeries[i + 1] = evalWhite;
        updateMoveBadge(i + 1, row);
        renderEvalGraph();
        if (displayPly === i + 1) {
            updateEvalUI();
            renderEnginePanel();
            renderNagOverlay();
            redrawBoardOverlays();
        }
    }

    if (token === analysisToken) {
        setAnalysisStatus('Stockfish review complete');
    }
}

function updateMoveBadge(ply, row) {
    if (!reviewMoveListEl) return;
    const item = reviewMoveListEl.querySelector(`.review-nav-move[data-ply="${ply}"]`);
    if (!item) return;
    applyBadgeToMove(item, row);
}

function applyBadgeToMove(item, row) {
    const badge = item.querySelector('.review-badge');
    if (!badge || !row || !row.verdict) return;
    badge.hidden = false;
    badge.className = `review-badge review-badge-compact ${row.verdict.key}`;
    badge.textContent = row.verdict.icon ? `${row.verdict.icon} ${row.verdict.label}` : row.verdict.label;
    const bestText = row.bestUci ? formatUciMove(row.bestUci) : 'n/a';
    badge.title = `CPL ${row.cpLoss}${row.bestUci ? ` | Best: ${bestText}` : ''}`;
}

function materialFromFen(fen) {
    const placement = String(fen || '').split(' ')[0] || '';
    let white = 0;
    let black = 0;
    for (const char of placement) {
        if (char === '/' || (char >= '1' && char <= '8')) continue;
        const lower = char.toLowerCase();
        const value = reviewPieceValues[lower] || 0;
        if (char === lower) {
            black += value;
        } else {
            white += value;
        }
    }
    return { w: white, b: black };
}

function getMaterialDelta(preFen, postFen, moverColor) {
    if (!preFen || !postFen || (moverColor !== 'w' && moverColor !== 'b')) return 0;
    const pre = materialFromFen(preFen);
    const post = materialFromFen(postFen);
    return (post[moverColor] || 0) - (pre[moverColor] || 0);
}

function getBestGap(preAnalysis) {
    if (!preAnalysis || !Array.isArray(preAnalysis.lines) || preAnalysis.lines.length < 2) return 0;
    const top = Number(preAnalysis.lines[0].scoreCp) || 0;
    const second = Number(preAnalysis.lines[1].scoreCp) || 0;
    return Math.max(0, top - second);
}

function classifyMove({ cpLoss, isBest, bestGap = 0, materialDelta = 0 }) {
    const loss = Math.max(0, Number(cpLoss) || 0);
    const onlyMove = isBest && bestGap >= 180;
    const sacrificed = materialDelta <= -300;

    if (isBest && sacrificed && loss <= 10) {
        return { key: 'brilliant', icon: '!!', label: 'Brilliant Move' };
    }
    if (isBest && onlyMove && loss <= 25) {
        return { key: 'great', icon: '!', label: 'Great Move' };
    }
    if (isBest && loss <= 15) {
        return { key: 'best', icon: '*', label: 'Best Move' };
    }
    if (loss <= 30) {
        return { key: 'excellent', icon: '!?', label: 'Excellent Move' };
    }
    if (loss <= 70) {
        return { key: 'good', icon: '!', label: 'Good Move' };
    }
    if (loss <= 140) {
        return { key: 'inaccuracy', icon: '?!', label: 'Inaccuracy' };
    }
    if (loss <= 300) {
        return { key: 'mistake', icon: '?', label: 'Mistake' };
    }
    return { key: 'blunder', icon: '??', label: 'Blunder' };
}

function formatUciMove(uci) {
    if (!uci || uci.length < 4) return 'n/a';
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4] ? `=${uci[4].toUpperCase()}` : '';
    return `${from} -> ${to}${promo}`;
}

function formatUciMoveShort(uci) {
    if (!uci || uci.length < 4) return '--';
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4] ? `=${uci[4].toUpperCase()}` : '';
    return `${from}${to}${promo}`;
}

function formatUciLine(line) {
    if (!Array.isArray(line) || !line.length) return '--';
    return line.map(formatUciMoveShort).join(' ');
}

function formatEvalCp(cp) {
    const value = Math.max(-10000, Math.min(10000, Number(cp) || 0));
    const pawns = value / 100;
    const sign = pawns > 0 ? '+' : '';
    return `${sign}${pawns.toFixed(2)}`;
}

function getTurnFromFen(fen) {
    const parts = String(fen || '').split(' ');
    return parts[1] === 'b' ? 'b' : 'w';
}

function evalForWhite(scoreCp, fen) {
    const cp = Number(scoreCp) || 0;
    const turn = getTurnFromFen(fen);
    return turn === 'w' ? cp : -cp;
}

function getLineMoves(analysis, index) {
    if (!analysis || !Array.isArray(analysis.lines)) return [];
    const line = analysis.lines[index];
    if (!line || !Array.isArray(line.pv)) return [];
    return line.pv;
}

function getLineDepth(analysis) {
    if (!analysis || !Array.isArray(analysis.lines) || !analysis.lines.length) return null;
    const depth = analysis.lines[0].depth;
    return Number.isFinite(depth) ? depth : null;
}

function updateEvalUI() {
    if (!evalScoreEl) return;
    const value = Number.isFinite(evalSeries[displayPly]) ? evalSeries[displayPly] : 0;
    evalScoreEl.textContent = formatEvalCp(value);
    if (evalTextEl) {
        evalTextEl.textContent = `Eval ${formatEvalCp(value)}`;
    }
    if (!evalBarEl || !evalFillEl || !evalMarkerEl) return;

    const maxCp = 1000;
    const normalized = (clampToBound(value, -maxCp, maxCp) + maxCp) / (2 * maxCp);
    const isHorizontal = evalBarEl.clientWidth > evalBarEl.clientHeight;

    if (isHorizontal) {
        evalFillEl.style.width = `${(normalized * 100).toFixed(2)}%`;
        evalFillEl.style.height = '100%';
        evalMarkerEl.style.left = `${(normalized * 100).toFixed(2)}%`;
        evalMarkerEl.style.top = '50%';
        evalMarkerEl.style.transform = 'translate(-50%, -50%)';
    } else {
        evalFillEl.style.height = `${(normalized * 100).toFixed(2)}%`;
        evalFillEl.style.width = '100%';
        evalMarkerEl.style.top = `${((1 - normalized) * 100).toFixed(2)}%`;
        evalMarkerEl.style.left = '50%';
        evalMarkerEl.style.transform = 'translate(-50%, -50%)';
    }
}

function renderEnginePanel() {
    if (!bestLineEl || !altLineEl || !depthTextEl) return;
    if (!moves.length || displayPly === 0) {
        bestLineEl.textContent = 'Best: --';
        altLineEl.textContent = 'Alt: --';
        depthTextEl.textContent = 'Depth --';
        if (evalTextEl) evalTextEl.textContent = 'Eval 0.00';
        return;
    }

    const row = analysisResults.get(displayPly);
    if (!row) {
        bestLineEl.textContent = 'Best: analyzing...';
        altLineEl.textContent = 'Alt: analyzing...';
        depthTextEl.textContent = 'Depth --';
        if (evalTextEl) evalTextEl.textContent = 'Eval --';
        return;
    }

    const bestLineText = row.bestLine && row.bestLine.length
        ? formatUciLine(row.bestLine)
        : row.bestUci
            ? formatUciMoveShort(row.bestUci)
            : '--';
    const altLineText = row.altLine && row.altLine.length ? formatUciLine(row.altLine) : '--';

    bestLineEl.textContent = `Best: ${bestLineText}`;
    altLineEl.textContent = `Alt: ${altLineText}`;
    depthTextEl.textContent = row.depth ? `Depth ${row.depth}` : 'Depth --';
    if (evalTextEl) evalTextEl.textContent = `Eval ${formatEvalCp(row.evalWhite)}`;
}

function renderNagOverlay() {
    if (!boardEl) return;
    boardEl.querySelectorAll('.square-nag').forEach(el => el.remove());
    if (!moves.length || displayPly <= 0) return;
    const row = analysisResults.get(displayPly);
    if (!row || !row.verdict || !row.verdict.icon) return;

    const move = moves[displayPly - 1];
    if (!move || !move.uci) return;
    const to = move.uci.slice(2, 4);
    const square = boardEl.querySelector(`[data-square="${to}"]`);
    if (!square) return;

    const nag = document.createElement('span');
    nag.className = `square-nag ${row.verdict.key}`;
    nag.textContent = row.verdict.icon;
    square.appendChild(nag);
}

function resizeEvalGraph() {
    if (!evalGraphEl) return;
    const rect = evalGraphEl.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    evalGraphScale = scale;
    evalGraphSize = { width: rect.width, height: rect.height };
    evalGraphEl.width = Math.max(1, Math.floor(rect.width * scale));
    evalGraphEl.height = Math.max(1, Math.floor(rect.height * scale));
    const ctx = evalGraphEl.getContext('2d');
    if (ctx) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    renderEvalGraph();
}

function renderEvalGraph() {
    if (!evalGraphEl || !evalGraphSize.width || !evalGraphSize.height) return;
    const ctx = evalGraphEl.getContext('2d');
    if (!ctx) return;

    const width = evalGraphSize.width;
    const height = evalGraphSize.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!evalSeries.length) return;
    const maxCp = 1000;
    const step = evalSeries.length > 1 ? width / (evalSeries.length - 1) : width;

    ctx.beginPath();
    evalSeries.forEach((value, index) => {
        const cp = clampToBound(Number(value) || 0, -maxCp, maxCp);
        const normalized = (cp + maxCp) / (2 * maxCp);
        const x = index * step;
        const y = (1 - normalized) * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = 'rgba(126, 243, 198, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(126, 243, 198, 0.12)';
    ctx.fill();

    const index = Math.min(displayPly, evalSeries.length - 1);
    const markerValue = clampToBound(Number(evalSeries[index]) || 0, -maxCp, maxCp);
    const markerNorm = (markerValue + maxCp) / (2 * maxCp);
    const markerX = index * step;
    const markerY = (1 - markerNorm) * height;

    ctx.fillStyle = 'rgba(90, 208, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

function syncArrowCanvas(size) {
    if (!arrowCanvasEl) return;
    const scale = window.devicePixelRatio || 1;
    arrowScale = scale;
    arrowCanvasEl.width = Math.max(1, Math.floor(size * scale));
    arrowCanvasEl.height = Math.max(1, Math.floor(size * scale));
    arrowCanvasEl.style.width = `${size}px`;
    arrowCanvasEl.style.height = `${size}px`;
    const ctx = arrowCanvasEl.getContext('2d');
    if (ctx) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
}

function redrawBoardOverlays() {
    if (!arrowCanvasEl) return;
    const ctx = arrowCanvasEl.getContext('2d');
    if (!ctx) return;
    const width = arrowCanvasEl.width / arrowScale;
    const height = arrowCanvasEl.height / arrowScale;
    ctx.clearRect(0, 0, width, height);

    if (!moves.length || displayPly <= 0) return;
    const row = analysisResults.get(displayPly);
    if (!row) return;

    drawMoveArrows(row);
}

function drawMoveArrows(row) {
    const bestUci = row.bestUci || (row.bestLine && row.bestLine[0]) || '';
    const altUci = row.altLine && row.altLine.length ? row.altLine[0] : '';
    if (bestUci) {
        drawArrow(bestUci, 'rgba(90, 208, 255, 0.85)', 5, false);
    }
    if (altUci && altUci !== bestUci) {
        drawArrow(altUci, 'rgba(255, 255, 255, 0.45)', 4, true);
    }
}

function drawArrow(uci, color, lineWidth, dashed) {
    if (!arrowCanvasEl || !boardEl || !boardShellEl) return;
    if (!uci || uci.length < 4) return;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const start = getSquareCenter(from);
    const end = getSquareCenter(to);
    if (!start || !end) return;

    const ctx = arrowCanvasEl.getContext('2d');
    if (!ctx) return;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 4) return;

    const headSize = 12;
    const padding = 14;
    const ux = dx / length;
    const uy = dy / length;
    const sx = start.x + ux * padding;
    const sy = start.y + uy * padding;
    const ex = end.x - ux * padding;
    const ey = end.y - uy * padding;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash(dashed ? [8, 6] : []);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ux * headSize - uy * (headSize * 0.5), ey - uy * headSize + ux * (headSize * 0.5));
    ctx.lineTo(ex - ux * headSize + uy * (headSize * 0.5), ey - uy * headSize - ux * (headSize * 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function getSquareCenter(square) {
    const cell = boardEl.querySelector(`[data-square="${square}"]`);
    if (!cell || !boardShellEl) return null;
    const rect = cell.getBoundingClientRect();
    const shellRect = boardShellEl.getBoundingClientRect();
    return {
        x: rect.left - shellRect.left + rect.width / 2,
        y: rect.top - shellRect.top + rect.height / 2,
    };
}

function jumpToPly(nextPly) {
    setDisplayPly(nextPly, true);
}

function previewMove(nextPly) {
    if (autoplayTimer || !moves.length) return;
    previewPly = Math.max(0, Math.min(Number(nextPly) || 0, moves.length));
    setDisplayPly(previewPly, false);
}

function clearPreview() {
    if (previewPly === null) return;
    previewPly = null;
    setDisplayPly(currentPly, false);
}

function setDisplayPly(nextPly, commit) {
    const clamped = Math.max(0, Math.min(Number(nextPly) || 0, moves.length));
    displayPly = clamped;
    if (commit) {
        currentPly = clamped;
        previewPly = null;
    }

    engine.reset();
    let applied = 0;
    let lastMoveInfo = null;

    for (let i = 0; i < displayPly; i++) {
        const info = applyUciMove(engine, moves[i].uci);
        if (!info) break;
        applied += 1;
        if (i === displayPly - 1) {
            lastMoveInfo = info;
        }
    }

    if (applied !== displayPly) {
        displayPly = applied;
        if (commit) {
            currentPly = applied;
        }
    }

    renderBoard(lastMoveInfo);
    renderMoveSelection();
    updateProgress();
    updateControlStates();
    updateEvalUI();
    renderEnginePanel();
    renderNagOverlay();
    redrawBoardOverlays();
    renderEvalGraph();

    if (autoplayTimer && currentPly >= moves.length) {
        stopAutoplay();
    }
}

function renderBoard(lastMoveInfo) {
    if (!boardEl) return;
    const snapshot = engine.getBoardSnapshot();

    boardEl.querySelectorAll('.square').forEach(square => {
        const algebraic = square.dataset.square;
        const { row, col } = engine.squareToCoords(algebraic);
        const piece = snapshot[row][col];
        square.innerHTML = '';
        square.classList.remove('last-move', 'capture', 'in-check');

        if (!piece) return;

        const img = document.createElement('img');
        img.className = `piece piece-${piece.color}`;
        img.src = pieceIcons[`${piece.color}${piece.type}`];
        img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
        img.draggable = false;
        square.appendChild(img);
    });

    if (lastMoveInfo) {
        const fromEl = boardEl.querySelector(`[data-square="${lastMoveInfo.from}"]`);
        const toEl = boardEl.querySelector(`[data-square="${lastMoveInfo.to}"]`);
        if (fromEl) fromEl.classList.add('last-move');
        if (toEl) {
            toEl.classList.add('last-move');
            if (lastMoveInfo.captured) {
                toEl.classList.add('capture');
            }
        }
    }

    const kingPos = engine.findKing(engine.turn);
    if (kingPos && engine.isInCheck(engine.turn)) {
        const sq = engine.coordsToSquare(kingPos.row, kingPos.col);
        const el = boardEl.querySelector(`[data-square="${sq}"]`);
        if (el) el.classList.add('in-check');
    }
}

function renderMoveSelection() {
    if (!reviewMoveListEl) return;
    reviewMoveListEl.querySelectorAll('.review-nav-move').forEach(item => {
        const ply = Number(item.dataset.ply);
        item.classList.toggle('active', ply === currentPly);
        item.classList.toggle('preview', previewPly !== null && ply === displayPly);
    });

    const target = reviewMoveListEl.querySelector(previewPly !== null ? '.review-nav-move.preview' : '.review-nav-move.active');
    if (target) {
        target.scrollIntoView({ block: 'nearest' });
    }
}

function updateProgress() {
    if (!reviewProgressTextEl) return;
    const turn = engine.turn === 'w' ? 'White' : 'Black';
    const moveLabel = previewPly !== null ? `Preview ${displayPly}` : `Move ${currentPly}`;
    const base = `${moveLabel} / ${moves.length} | Turn: ${turn}`;
    reviewProgressTextEl.textContent = analysisStatus ? `${base} | ${analysisStatus}` : base;
}

function updateControlStates() {
    const hasMoves = moves.length > 0;
    if (firstMoveBtn) firstMoveBtn.disabled = !hasMoves || currentPly <= 0;
    if (prevMoveBtn) prevMoveBtn.disabled = !hasMoves || currentPly <= 0;
    if (nextMoveBtn) nextMoveBtn.disabled = !hasMoves || currentPly >= moves.length;
    if (lastMoveBtn) lastMoveBtn.disabled = !hasMoves || currentPly >= moves.length;
    if (playPauseBtn) playPauseBtn.disabled = !hasMoves;
}

function clampToBound(value, min, max) {
    return Math.min(Math.max(value, min), max);
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
    const moverColor = simEngine.turn;
    const capturedPiece = simEngine.getPiece(found.to.row, found.to.col);
    let epCaptured = null;
    if (found.enPassantCapture) {
        const dir = moverColor === 'w' ? 1 : -1;
        epCaptured = simEngine.getPiece(found.to.row + dir, found.to.col);
    }
    simEngine.applyMove(found);
    return {
        move: found,
        from,
        to,
        captured: capturedPiece || epCaptured,
        moverColor,
    };
}

function toggleAutoplay() {
    if (autoplayTimer) {
        stopAutoplay();
        return;
    }

    if (!moves.length) return;
    previewPly = null;
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
