'use client';

import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { usePlayer } from '@/lib/session';

/* =========================================================================
   Ajedrez pixel art · reglas con chess.js · IA minimax con poda alfa-beta
   ========================================================================= */

const SPRITES: Record<PieceSymbol, string[]> = {
  p: ['............', '............', '............', '.....##.....', '....####....', '....####....', '.....##.....', '....####....', '.....##.....', '....####....', '...######...', '..########..'],
  r: ['............', '............', '..##.##.##..', '..########..', '...######...', '...######...', '...######...', '...######...', '...######...', '..########..', '.##########.', '.##########.'],
  n: ['............', '.....##.....', '....####....', '...######...', '..###.####..', '..#######...', '.....####...', '....#####...', '...######...', '...######...', '..########..', '.##########.'],
  b: ['............', '.....##.....', '....####....', '...##.###...', '...#.####...', '...######...', '....####....', '.....##.....', '....####....', '...######...', '..########..', '.##########.'],
  q: ['............', '.#...##...#.', '.##.####.##.', '.##########.', '..########..', '...######...', '....####....', '....####....', '...######...', '..########..', '.##########.', '.##########.'],
  k: ['.....##.....', '....####....', '.....##.....', '...######...', '..########..', '..########..', '...######...', '....####....', '...######...', '..########..', '.##########.', '.##########.'],
};

const COLORS = {
  w: { fill: '#eaf6ff', shade: '#9fe8ff' },
  b: { fill: '#ff2bd6', shade: '#a2178c' },
};

export function PixelPiece({ type, color }: { type: PieceSymbol; color: 'w' | 'b' }) {
  const px: [number, number][] = [];
  SPRITES[type].forEach((row, y) => row.split('').forEach((c, x) => c === '#' && px.push([x, y])));
  const c = COLORS[color];
  return (
    <svg viewBox="-1 -1 14 14" shapeRendering="crispEdges" className="piece" aria-hidden="true">
      {px.map(([x, y]) => (
        <rect key={`o${x}-${y}`} x={x - 1} y={y - 1} width={3} height={3} fill="#09011a" />
      ))}
      {px.map(([x, y]) => (
        <rect key={`f${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={x > 6 || y > 9 ? c.shade : c.fill} />
      ))}
    </svg>
  );
}

/* ---------- IA ---------- */
const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const CENTER = [0, 1, 2, 3, 3, 2, 1, 0];

function evaluate(game: Chess) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let score = 0;
  game.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq) return;
      let v = VALUE[sq.type];
      if (sq.type === 'n' || sq.type === 'b' || sq.type === 'p') v += (CENTER[r] + CENTER[f]) * 4;
      if (sq.type === 'p') v += (sq.color === 'w' ? 7 - r : r) * 6; // avanzar peones
      score += sq.color === 'w' ? v : -v;
    }),
  );
  return score;
}

function orderMoves(moves: Move[]) {
  return moves.sort((a, b) => (b.captured ? VALUE[b.captured] - VALUE[b.piece] / 10 : 0) - (a.captured ? VALUE[a.captured] - VALUE[a.piece] / 10 : 0));
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, max: boolean): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = orderMoves(game.moves({ verbose: true }));
  if (max) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    game.move(m);
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function bestMove(fen: string, depth: number, randomness: number): Move | null {
  const game = new Chess(fen);
  const moves = orderMoves(game.moves({ verbose: true }));
  if (!moves.length) return null;
  if (Math.random() < randomness) return moves[Math.floor(Math.random() * moves.length)];
  const max = game.turn() === 'w';
  let best: Move | null = null;
  let bestScore = max ? -Infinity : Infinity;
  for (const m of moves) {
    game.move(m);
    const s = minimax(game, depth - 1, -Infinity, Infinity, !max) + Math.random() * 6;
    game.undo();
    if (max ? s > bestScore : s < bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

const LEVELS = [
  { id: 'facil', label: 'FÁCIL', depth: 1, random: 0.35, xp: 20 },
  { id: 'normal', label: 'NORMAL', depth: 2, random: 0.05, xp: 50 },
  { id: 'dificil', label: 'DIFÍCIL', depth: 3, random: 0, xp: 120 },
];

export function ChessGame() {
  const { addXP } = usePlayer();
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [mode, setMode] = useState<'ai' | 'local'>('ai');
  const [human, setHuman] = useState<'w' | 'b'>('w');
  const [level, setLevel] = useState(LEVELS[1]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const rewarded = useRef(false);

  const g = game.current;
  const board = useMemo(() => new Chess(fen).board(), [fen]);
  const flipped = mode === 'ai' ? human === 'b' : false;
  const targets = useMemo(() => (selected ? new Chess(fen).moves({ square: selected, verbose: true }).map((m) => m.to) : []), [selected, fen]);

  const status = (() => {
    if (g.isCheckmate()) return `¡JAQUE MATE! GANAN ${g.turn() === 'w' ? 'NEGRAS' : 'BLANCAS'}`;
    if (g.isStalemate()) return 'TABLAS POR AHOGADO';
    if (g.isDraw()) return 'TABLAS';
    return `${thinking ? 'LA MÁQUINA PIENSA...' : `TURNO: ${g.turn() === 'w' ? 'BLANCAS' : 'NEGRAS'}`}${g.inCheck() ? ' · ¡JAQUE!' : ''}`;
  })();

  const doMove = useCallback((from: string, to: string) => {
    try {
      const m = game.current.move({ from, to, promotion: 'q' });
      setLast({ from: m.from, to: m.to });
      setFen(game.current.fen());
      setSelected(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  // turno de la IA
  useEffect(() => {
    if (mode !== 'ai' || g.isGameOver() || g.turn() === human) return;
    setThinking(true);
    const id = setTimeout(() => {
      const m = bestMove(game.current.fen(), level.depth, level.random);
      if (m) doMove(m.from, m.to);
      setThinking(false);
    }, 350);
    return () => clearTimeout(id);
  }, [fen, mode, human, level, doMove, g]);

  // recompensa al ganar a la IA
  useEffect(() => {
    if (mode === 'ai' && g.isCheckmate() && !rewarded.current) {
      rewarded.current = true;
      if (g.turn() !== human) addXP(level.xp, `ganaste al ajedrez (${level.label.toLowerCase()})`);
    }
  }, [fen, mode, human, level, addXP, g]);

  const reset = (color = human) => {
    game.current = new Chess();
    rewarded.current = false;
    setHuman(color);
    setFen(game.current.fen());
    setSelected(null);
    setLast(null);
  };

  const clickSquare = (sq: Square) => {
    if (g.isGameOver() || thinking) return;
    if (mode === 'ai' && g.turn() !== human) return;
    const piece = g.get(sq);
    if (selected && targets.includes(sq)) return void doMove(selected, sq);
    if (piece && piece.color === g.turn()) setSelected(sq === selected ? null : sq);
    else setSelected(null);
  };

  const undo = () => {
    g.undo();
    if (mode === 'ai' && g.turn() !== human) g.undo();
    setFen(g.fen());
    setLast(null);
    setSelected(null);
  };

  const files = 'abcdefgh';
  const rows = flipped ? [0, 1, 2, 3, 4, 5, 6, 7].reverse() : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const captured = (color: 'w' | 'b') => {
    const start: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    board.flat().forEach((s) => s && s.color === color && start[s.type]--);
    return (Object.keys(start) as PieceSymbol[]).flatMap((t) => Array(Math.max(0, start[t])).fill(t) as PieceSymbol[]);
  };

  return (
    <div className="game">
      <div className="game__controls">
        <div className="row row--tight">
          <button className={`chip${mode === 'ai' ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--cyan)' }} onClick={() => (setMode('ai'), reset())}>
            VS MÁQUINA
          </button>
          <button className={`chip${mode === 'local' ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--cyan)' }} onClick={() => (setMode('local'), reset('w'))}>
            2 JUGADORES
          </button>
        </div>
        {mode === 'ai' && (
          <>
            <div className="row row--tight">
              {LEVELS.map((l) => (
                <button key={l.id} className={`chip${level.id === l.id ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--yellow)' }} onClick={() => (setLevel(l), reset())}>
                  {l.label} · {l.xp}XP
                </button>
              ))}
            </div>
            <div className="row row--tight">
              <button className={`chip${human === 'w' ? ' is-on' : ''}`} style={{ ['--c' as string]: '#eaf6ff' }} onClick={() => reset('w')}>
                JUEGO CON BLANCAS
              </button>
              <button className={`chip${human === 'b' ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--pink)' }} onClick={() => reset('b')}>
                JUEGO CON NEGRAS
              </button>
            </div>
          </>
        )}
      </div>

      <p className={`game__status${g.isGameOver() ? ' is-over' : ''}`}>{status}</p>

      <div className="captured">{captured('b').map((t, i) => <PixelPiece key={i} type={t} color="b" />)}</div>
      <div className="chessboard" role="grid" aria-label="Tablero de ajedrez">
        {rows.map((r) =>
          cols.map((f) => {
            const sq = `${files[f]}${8 - r}` as Square;
            const piece = board[r][f];
            const light = (r + f) % 2 === 0;
            const cls = [
              'sq',
              light ? 'sq--light' : 'sq--dark',
              selected === sq && 'is-selected',
              last && (last.from === sq || last.to === sq) && 'is-last',
              targets.includes(sq) && (piece ? 'is-capture' : 'is-target'),
              piece?.type === 'k' && piece.color === g.turn() && g.inCheck() && 'is-check',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={sq} className={cls} onClick={() => clickSquare(sq)} aria-label={`${sq}${piece ? ` ${piece.color === 'w' ? 'blanca' : 'negra'} ${piece.type}` : ''}`}>
                {piece && <PixelPiece type={piece.type} color={piece.color} />}
                {(flipped ? f === 7 : f === 0) && <span className="sq__rank">{8 - r}</span>}
                {(flipped ? r === 0 : r === 7) && <span className="sq__file">{files[f]}</span>}
              </button>
            );
          }),
        )}
      </div>
      <div className="captured">{captured('w').map((t, i) => <PixelPiece key={i} type={t} color="w" />)}</div>

      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-sm" onClick={undo} disabled={!g.history().length || thinking}>
          <Icon name="arrow-left" /> DESHACER
        </button>
        <button className="btn btn-sm btn-solid" onClick={() => reset()}>
          <Icon name="reset" /> NUEVA PARTIDA
        </button>
      </div>
      <p className="dim" style={{ textAlign: 'center', fontSize: 15, margin: 0 }}>Los peones coronan automáticamente en dama.</p>
    </div>
  );
}
