import { ChessEngine } from './chessEngine.js';

class AiPlayer {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    chooseMove(engine) {
        const color = engine.turn;
        const legalMoves = engine.generateLegalMoves(color);
        if (!legalMoves.length) return null;

        if (this.difficulty === 'easy') {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }

        if (this.difficulty === 'medium') {
            return this.pickShallow(engine, legalMoves, color, 2);
        }

        return this.minimaxRoot(engine, legalMoves, color, 3);
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

export { AiPlayer };
