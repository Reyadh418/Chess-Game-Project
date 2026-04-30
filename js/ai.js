const STOCKFISH_CDN = 'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

class StockfishClient {
    constructor() {
        this.worker = null;
        this.pending = [];
        this.ready = false;
        this.lineListeners = new Set();
    }

    supportsWorkers() {
        return typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined';
    }

    async init() {
        if (this.worker) return;
        if (!this.supportsWorkers()) {
            throw new Error('Workers are not supported in this browser');
        }

        const bootstrap = `importScripts('${STOCKFISH_CDN}');`;
        const blob = new Blob([bootstrap], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        try {
            this.worker = new Worker(url);
        } finally {
            URL.revokeObjectURL(url);
        }

        this.worker.onmessage = event => {
            const line = String(event.data || '').trim();
            if (!line) return;

            this.lineListeners.forEach(listener => {
                try {
                    listener(line);
                } catch (_) {
                    // Listener errors should not break worker message processing.
                }
            });

            for (let i = 0; i < this.pending.length; i++) {
                const waiter = this.pending[i];
                if (waiter.test(line)) {
                    this.pending.splice(i, 1);
                    waiter.resolve(line);
                    break;
                }
            }
        };

        this.worker.onerror = event => {
            const err = new Error(event.message || 'Stockfish worker error');
            this.flushPending(err);
        };

        this.send('uci');
        await this.waitFor(line => line === 'uciok', 5000);
        this.send('isready');
        await this.waitFor(line => line === 'readyok', 5000);
        this.ready = true;
    }

    flushPending(error) {
        const waiters = [...this.pending];
        this.pending = [];
        waiters.forEach(waiter => waiter.reject(error));
    }

    send(command) {
        if (!this.worker) throw new Error('Stockfish worker is not initialized');
        this.worker.postMessage(command);
    }

    onLine(listener) {
        this.lineListeners.add(listener);
    }

    offLine(listener) {
        this.lineListeners.delete(listener);
    }

    waitFor(test, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const waiter = { test, resolve, reject };
            this.pending.push(waiter);

            const timeout = setTimeout(() => {
                const idx = this.pending.indexOf(waiter);
                if (idx !== -1) {
                    this.pending.splice(idx, 1);
                }
                reject(new Error('Stockfish response timed out'));
            }, timeoutMs);

            waiter.resolve = line => {
                clearTimeout(timeout);
                resolve(line);
            };
            waiter.reject = err => {
                clearTimeout(timeout);
                reject(err);
            };
        });
    }

    async getBestMove(fen, options = {}) {
        const moveTimeMs = Math.max(150, Number(options.moveTimeMs) || 700);
        const skillLevel = Math.min(20, Math.max(0, Number(options.skillLevel) || 10));
        const limitStrength = options.limitStrength !== false;
        await this.init();

        this.send(`setoption name Skill Level value ${skillLevel}`);
        this.send(`setoption name UCI_LimitStrength value ${limitStrength ? 'true' : 'false'}`);
        this.send('isready');
        await this.waitFor(line => line === 'readyok', 5000);

        this.send(`position fen ${fen}`);
        this.send(`go movetime ${moveTimeMs}`);
        const bestLine = await this.waitFor(line => line.startsWith('bestmove '), moveTimeMs + 5000);
        const parts = bestLine.split(/\s+/);
        const best = parts[1];
        if (!best || best === '(none)') return null;
        return best;
    }

    async analyzePosition(fen, options = {}) {
        const moveTimeMs = Math.max(120, Number(options.moveTimeMs) || 250);
        const skillLevel = Math.min(20, Math.max(0, Number(options.skillLevel) || 20));
        const multiPv = Math.max(1, Number(options.multiPv) || 1);
        await this.init();

        this.send(`setoption name Skill Level value ${skillLevel}`);
        this.send('setoption name UCI_LimitStrength value false');
        this.send(`setoption name MultiPV value ${multiPv}`);
        this.send('isready');
        await this.waitFor(line => line === 'readyok', 5000);

        let latestScore = null;
        const linesByPv = new Map();
        const infoListener = line => {
            if (!line.startsWith('info ') || !line.includes(' score ')) return;
            const parsed = this.parseScoreLine(line);
            if (!parsed) return;

            const tokens = line.split(/\s+/);
            const multiPvIndex = tokens.indexOf('multipv');
            const pvIndex = multiPvIndex >= 0 ? Number(tokens[multiPvIndex + 1]) : 1;
            const pvTokenIndex = tokens.indexOf('pv');
                const depthIndex = tokens.indexOf('depth');
                const depth = depthIndex >= 0 ? Number(tokens[depthIndex + 1]) : null;
                const pvMove = pvTokenIndex >= 0 ? tokens[pvTokenIndex + 1] : null;
                const pvMoves = pvTokenIndex >= 0 ? tokens.slice(pvTokenIndex + 1, pvTokenIndex + 9) : [];

            linesByPv.set(pvIndex, { score: parsed, pvMove, pvMoves, depth });
            if (pvIndex === 1) {
                latestScore = parsed;
            }
        };

        this.onLine(infoListener);
        try {
            this.send(`position fen ${fen}`);
            this.send(`go movetime ${moveTimeMs}`);
            const bestLine = await this.waitFor(line => line.startsWith('bestmove '), moveTimeMs + 5000);
            const parts = bestLine.split(/\s+/);
            const bestMove = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
            const normalized = this.normalizeScore(latestScore);
            const lines = [...linesByPv.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([pvIndex, data]) => ({
                    pvIndex,
                    scoreCp: this.normalizeScore(data.score),
                        pvMove: data.pvMove,
                        pv: data.pvMoves || [],
                        depth: data.depth || null,
                }));
            return {
                bestMove,
                scoreCp: normalized,
                rawScore: latestScore,
                lines,
            };
        } finally {
            this.offLine(infoListener);
        }
    }

    parseScoreLine(line) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        if (cpMatch) {
            return { type: 'cp', value: Number(cpMatch[1]) };
        }
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
            return { type: 'mate', value: Number(mateMatch[1]) };
        }
        return null;
    }

    normalizeScore(score) {
        if (!score) return 0;
        if (score.type === 'cp') return score.value;
        if (score.type === 'mate') {
            const sign = score.value > 0 ? 1 : -1;
            const distance = Math.max(0, 10 - Math.min(Math.abs(score.value), 10));
            return sign * (10000 - distance * 100);
        }
        return 0;
    }
}

class AiPlayer {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        this.stockfish = new StockfishClient();
        this.stockfishAvailable = true;
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    async chooseMove(engine, options = {}) {
        const color = engine.turn;
        const legalMoves = engine.generateLegalMoves(color);
        if (!legalMoves.length) return null;

        if (this.difficulty === 'easy') {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }

        if (this.stockfishAvailable) {
            try {
                const move = await this.chooseWithStockfish(engine, legalMoves, options);
                if (move) return move;
            } catch (error) {
                this.stockfishAvailable = false;
                console.warn('Stockfish unavailable, falling back to built-in AI.', error);
            }
        }

        if (this.difficulty === 'medium') {
            return this.pickShallow(engine, legalMoves, color, 2);
        }

        if (this.difficulty === 'hard') {
            return this.minimaxRoot(engine, legalMoves, color, 3);
        }

        return this.minimaxRoot(engine, legalMoves, color, 4);
    }

    async chooseWithStockfish(engine, legalMoves, options = {}) {
        const fen = engine.getFen();
        const moveTimeMs = Math.max(150, Number(options.thinkTimeMs) || 700);
        const skillMap = { medium: 10, hard: 18, grandmaster: 20 };
        const skillLevel = skillMap[this.difficulty] ?? 10;
        const uciMove = await this.stockfish.getBestMove(fen, {
            moveTimeMs,
            skillLevel,
            limitStrength: this.difficulty !== 'grandmaster',
        });
        if (!uciMove) return null;
        return this.mapUciToLegalMove(uciMove, legalMoves);
    }

    mapUciToLegalMove(uciMove, legalMoves) {
        if (!uciMove || uciMove.length < 4) return null;
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promo = uciMove[4] ? uciMove[4].toLowerCase() : null;

        return legalMoves.find(move => {
            const fromSq = this.coordsToSquare(move.from.row, move.from.col);
            const toSq = this.coordsToSquare(move.to.row, move.to.col);
            if (fromSq !== from || toSq !== to) return false;
            if (promo) {
                return (move.promotion || '').toLowerCase() === promo;
            }
            return true;
        }) || null;
    }

    coordsToSquare(row, col) {
        return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
    }

    pickShallow(engine, moves, color, depth) {
        let best = null;
        let bestScore = -Infinity;
        for (const move of moves) {
            const record = engine.applyMove(move);
            const score = -this.minimax(engine, depth - 1, -Infinity, Infinity, engine.turn);
            engine.undo();
            if (score > bestScore) {
                bestScore = score;
                best = move;
            }
        }
        return best;
    }

    minimaxRoot(engine, moves, color, depth) {
        let bestMove = null;
        let bestScore = -Infinity;
        let alpha = -Infinity;
        let beta = Infinity;
        for (const move of moves) {
            const record = engine.applyMove(move);
            const score = -this.minimax(engine, depth - 1, -beta, -alpha, engine.turn);
            engine.undo();
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestScore);
        }
        return bestMove;
    }

    minimax(engine, depth, alpha, beta, color) {
        const state = engine.getGameState();
        if (state.status === 'checkmate') {
            return color === engine.turn ? -Infinity : Infinity;
        }
        if (state.status === 'stalemate') {
            return 0;
        }

        if (depth === 0) {
            return this.evaluateBoard(engine, color);
        }

        const moves = engine.generateLegalMoves(color);
        let maxEval = -Infinity;
        for (const move of moves) {
            engine.applyMove(move);
            const evalScore = -this.minimax(engine, depth - 1, -beta, -alpha, engine.turn);
            engine.undo();
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    }

    evaluateBoard(engine, perspective) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = engine.getPiece(r, c);
                if (!piece) continue;
                const value = this.values[piece.type];
                score += piece.color === perspective ? value : -value;
            }
        }
        return score + this.mobilityBonus(engine, perspective) + this.kingSafety(engine, perspective);
    }

    mobilityBonus(engine, color) {
        const myMoves = engine.generateLegalMoves(color).length;
        const oppMoves = engine.generateLegalMoves(engine.opponent(color)).length || 1;
        return (myMoves - oppMoves) * 1.5;
    }

    kingSafety(engine, color) {
        const kingPos = engine.findKing(color);
        if (!kingPos) return 0;
        const danger = engine.isSquareAttacked(kingPos.row, kingPos.col, engine.opponent(color));
        return danger ? -50 : 10;
    }
}

export { AiPlayer, StockfishClient };
