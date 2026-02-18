class ChessEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.buildStartingBoard();
        this.turn = 'w';
        this.enPassantTarget = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
        this.history = [];
    }

    buildStartingBoard() {
        const empty = Array.from({ length: 8 }, () => Array(8).fill(null));
        const placeBackRank = (row, color) => {
            const pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
            pieces.forEach((type, col) => {
                empty[row][col] = this.makePiece(type, color);
            });
        };

        placeBackRank(0, 'b');
        placeBackRank(7, 'w');
        for (let col = 0; col < 8; col++) {
            empty[1][col] = this.makePiece('p', 'b');
            empty[6][col] = this.makePiece('p', 'w');
        }
        return empty;
    }

    makePiece(type, color) {
        return { type, color, hasMoved: false };
    }

    squareToCoords(square) {
        const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(square[1], 10);
        return { row: rank, col: file };
    }

    coordsToSquare(row, col) {
        return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
    }

    inBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getPiece(row, col) {
        return this.board[row][col];
    }

    setPiece(row, col, piece) {
        this.board[row][col] = piece;
    }

    clonePiece(piece) {
        return piece ? { ...piece } : null;
    }

    cloneBoard() {
        return this.board.map(row => row.map(cell => this.clonePiece(cell)));
    }

    generateLegalMoves(color = this.turn) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (!piece || piece.color !== color) continue;
                const pseudo = this.generatePseudoMoves(row, col, piece);
                for (const move of pseudo) {
                    const record = this.applyMove(move, { dryRun: true });
                    if (!this.isInCheck(color)) {
                        moves.push(move);
                    }
                    this.undoMove(record);
                }
            }
        }
        return moves;
    }

    generatePseudoMoves(row, col, piece) {
        const moves = [];
        const directions = {
            n: [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ],
            b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]],
            k: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
        };

        if (piece.type === 'p') {
            const dir = piece.color === 'w' ? -1 : 1;
            const startRow = piece.color === 'w' ? 6 : 1;

            const oneStep = { row: row + dir, col };
            if (this.inBounds(oneStep.row, oneStep.col) && !this.getPiece(oneStep.row, oneStep.col)) {
                moves.push({ from: { row, col }, to: oneStep });
                const twoStep = { row: row + dir * 2, col };
                if (row === startRow && !this.getPiece(twoStep.row, twoStep.col)) {
                    moves.push({ from: { row, col }, to: twoStep, enPassantTarget: { row: row + dir, col } });
                }
            }

            // captures
            const captureCols = [col - 1, col + 1];
            for (const c of captureCols) {
                const targetRow = row + dir;
                if (!this.inBounds(targetRow, c)) continue;
                const targetPiece = this.getPiece(targetRow, c);
                if (targetPiece && targetPiece.color !== piece.color) {
                    moves.push({ from: { row, col }, to: { row: targetRow, col: c } });
                }
                // en passant capture
                if (this.enPassantTarget && this.enPassantTarget.row === targetRow && this.enPassantTarget.col === c) {
                    moves.push({ from: { row, col }, to: { row: targetRow, col: c }, enPassantCapture: true });
                }
            }

            // promotions flagged later
        } else if (piece.type === 'n') {
            for (const [dr, dc] of directions.n) {
                const r = row + dr;
                const c = col + dc;
                if (!this.inBounds(r, c)) continue;
                const target = this.getPiece(r, c);
                if (!target || target.color !== piece.color) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                }
            }
        } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
            const dirs = directions[piece.type];
            for (const [dr, dc] of dirs) {
                let r = row + dr;
                let c = col + dc;
                while (this.inBounds(r, c)) {
                    const target = this.getPiece(r, c);
                    if (!target) {
                        moves.push({ from: { row, col }, to: { row: r, col: c } });
                    } else {
                        if (target.color !== piece.color) {
                            moves.push({ from: { row, col }, to: { row: r, col: c } });
                        }
                        break;
                    }
                    r += dr;
                    c += dc;
                }
            }
        } else if (piece.type === 'k') {
            for (const [dr, dc] of directions.k) {
                const r = row + dr;
                const c = col + dc;
                if (!this.inBounds(r, c)) continue;
                const target = this.getPiece(r, c);
                if (!target || target.color !== piece.color) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                }
            }
            // Castling
            if (!piece.hasMoved && !this.isInCheck(piece.color)) {
                const kingRow = row;
                // king side
                if (this.canCastle(piece.color, 'king')) {
                    moves.push({ from: { row, col }, to: { row: kingRow, col: col + 2 }, castle: 'king' });
                }
                // queen side
                if (this.canCastle(piece.color, 'queen')) {
                    moves.push({ from: { row, col }, to: { row: kingRow, col: col - 2 }, castle: 'queen' });
                }
            }
        }

        // promotions transformation marker
        if (piece.type === 'p') {
            const endRow = piece.color === 'w' ? 0 : 7;
            moves.forEach(m => {
                if (m.to.row === endRow) {
                    m.promotion = 'q';
                }
            });
        }

        return moves;
    }

    canCastle(color, side) {
        const row = color === 'w' ? 7 : 0;
        const king = this.getPiece(row, 4);
        if (!king || king.type !== 'k' || king.hasMoved) return false;

        if (side === 'king') {
            const rook = this.getPiece(row, 7);
            if (!rook || rook.type !== 'r' || rook.color !== color || rook.hasMoved) return false;
            if (this.getPiece(row, 5) || this.getPiece(row, 6)) return false;
            if (this.isSquareAttacked(row, 5, this.opponent(color)) || this.isSquareAttacked(row, 6, this.opponent(color))) return false;
            return true;
        }

        if (side === 'queen') {
            const rook = this.getPiece(row, 0);
            if (!rook || rook.type !== 'r' || rook.color !== color || rook.hasMoved) return false;
            if (this.getPiece(row, 1) || this.getPiece(row, 2) || this.getPiece(row, 3)) return false;
            if (this.isSquareAttacked(row, 2, this.opponent(color)) || this.isSquareAttacked(row, 3, this.opponent(color))) return false;
            return true;
        }
        return false;
    }

    opponent(color) {
        return color === 'w' ? 'b' : 'w';
    }

    applyMove(move, options = {}) {
        const { dryRun = false } = options;
        const movingPiece = this.clonePiece(this.getPiece(move.from.row, move.from.col));
        const capturedPiece = this.clonePiece(this.getPiece(move.to.row, move.to.col));
        const prevEnPassant = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        const prevHalfmove = this.halfmoveClock;
        const prevFullmove = this.fullmoveNumber;
        const prevTurn = this.turn;

        let enPassantCaptured = null;
        let rookMove = null;
        let rookOriginal = null;

        // en passant capture removal
        if (move.enPassantCapture) {
            const dir = movingPiece.color === 'w' ? 1 : -1;
            const capRow = move.to.row + dir;
            enPassantCaptured = this.clonePiece(this.getPiece(capRow, move.to.col));
            this.setPiece(capRow, move.to.col, null);
        }

        // castling rook move
        if (move.castle) {
            const row = move.from.row;
            if (move.castle === 'king') {
                rookMove = { from: { row, col: 7 }, to: { row, col: 5 } };
            } else {
                rookMove = { from: { row, col: 0 }, to: { row, col: 3 } };
            }
            const rookPiece = this.getPiece(rookMove.from.row, rookMove.from.col);
            rookOriginal = this.clonePiece(rookPiece);
            this.setPiece(rookMove.from.row, rookMove.from.col, null);
            this.setPiece(rookMove.to.row, rookMove.to.col, { ...rookPiece, hasMoved: true });
        }

        // move piece
        this.setPiece(move.from.row, move.from.col, null);
        const promoted = move.promotion ? this.makePiece(move.promotion, movingPiece.color) : { ...movingPiece, hasMoved: true };
        this.setPiece(move.to.row, move.to.col, promoted);

        // update en passant target
        this.enPassantTarget = move.enPassantTarget ? { ...move.enPassantTarget } : null;

        if (!dryRun) {
            this.turn = this.opponent(this.turn);
            if (movingPiece.type === 'p' || capturedPiece) {
                this.halfmoveClock = 0;
            } else {
                this.halfmoveClock += 1;
            }
            if (movingPiece.color === 'b') {
                this.fullmoveNumber += 1;
            }
        }

        const record = {
            move,
            movingPiece,
            capturedPiece,
            enPassantCaptured,
            prevEnPassant,
            rookMove,
            rookOriginal,
            prevHalfmove,
            prevFullmove,
            prevTurn,
        };

        if (!dryRun) {
            this.history.push(record);
        }
        return record;
    }

    undoMove(record) {
        if (!record) return;
        // restore turn values
        this.turn = record.prevTurn;
        this.halfmoveClock = record.prevHalfmove;
        this.fullmoveNumber = record.prevFullmove;
        this.enPassantTarget = record.prevEnPassant;

        const { move } = record;
        // undo main move
        this.setPiece(move.to.row, move.to.col, null);
        this.setPiece(move.from.row, move.from.col, { ...record.movingPiece });

        // restore capture
        if (record.enPassantCaptured) {
            const dir = record.movingPiece.color === 'w' ? 1 : -1;
            const capRow = move.to.row + dir;
            this.setPiece(capRow, move.to.col, record.enPassantCaptured);
        } else if (record.capturedPiece) {
            this.setPiece(move.to.row, move.to.col, record.capturedPiece);
        }

        // undo rook move if castling
        if (record.rookMove) {
            this.setPiece(record.rookMove.to.row, record.rookMove.to.col, null);
            this.setPiece(record.rookMove.from.row, record.rookMove.from.col, { ...record.rookOriginal });
        }
    }

    undo() {
        const record = this.history.pop();
        this.undoMove(record);
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        return this.isSquareAttacked(kingPos.row, kingPos.col, this.opponent(color));
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.getPiece(row, col);
                if (p && p.type === 'k' && p.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        // pawn attacks
        const pawnDir = byColor === 'w' ? -1 : 1;
        for (const dc of [-1, 1]) {
            const r = row + pawnDir;
            const c = col + dc;
            if (this.inBounds(r, c)) {
                const p = this.getPiece(r, c);
                if (p && p.color === byColor && p.type === 'p') return true;
            }
        }

        // knight attacks
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightMoves) {
            const r = row + dr;
            const c = col + dc;
            if (!this.inBounds(r, c)) continue;
            const p = this.getPiece(r, c);
            if (p && p.color === byColor && p.type === 'n') return true;
        }

        // sliding attacks
        const directions = {
            rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        };

        for (const [dr, dc] of directions.rook) {
            let r = row + dr;
            let c = col + dc;
            while (this.inBounds(r, c)) {
                const p = this.getPiece(r, c);
                if (p) {
                    if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
                    break;
                }
                r += dr; c += dc;
            }
        }

        for (const [dr, dc] of directions.bishop) {
            let r = row + dr;
            let c = col + dc;
            while (this.inBounds(r, c)) {
                const p = this.getPiece(r, c);
                if (p) {
                    if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
                    break;
                }
                r += dr; c += dc;
            }
        }

        // king proximity
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
            const r = row + dr;
            const c = col + dc;
            if (!this.inBounds(r, c)) continue;
            const p = this.getPiece(r, c);
            if (p && p.color === byColor && p.type === 'k') return true;
        }

        return false;
    }

    getGameState() {
        const legal = this.generateLegalMoves(this.turn);
        if (legal.length === 0) {
            if (this.isInCheck(this.turn)) {
                return { status: 'checkmate', winner: this.opponent(this.turn) };
            }
            return { status: 'stalemate' };
        }
        return { status: 'ongoing', inCheck: this.isInCheck(this.turn), legalMoves: legal };
    }

    getBoardSnapshot() {
        return this.board.map((row, r) => row.map((cell, c) => {
            if (!cell) return null;
            return { ...cell, square: this.coordsToSquare(r, c) };
        }));
    }
}

export { ChessEngine };
