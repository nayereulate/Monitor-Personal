'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { usePlayer } from '@/lib/session';

/* 3 en raya pixel art · IA minimax (imbatible en modo difícil) */
type Cell = 'X' | 'O' | null;
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winner(b: Cell[]) {
  for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { who: b[l[0]]!, line: l };
  return null;
}

function minimax(b: Cell[], turn: 'X' | 'O', me: 'O'): number {
  const w = winner(b);
  if (w) return w.who === me ? 10 : -10;
  if (b.every(Boolean)) return 0;
  const scores = b.flatMap((c, i) => {
    if (c) return [];
    const next = [...b];
    next[i] = turn;
    return [minimax(next, turn === 'X' ? 'O' : 'X', me) * 0.9];
  });
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

function aiMove(b: Cell[], hard: boolean) {
  const free = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!hard && Math.random() < 0.35) return free[Math.floor(Math.random() * free.length)];
  let best = free[0];
  let score = -Infinity;
  for (const i of free) {
    const next = [...b];
    next[i] = 'O';
    const s = minimax(next, 'X', 'O');
    if (s > score) (score = s), (best = i);
  }
  return best;
}

const X_PX = ['#....#', '##..##', '.####.', '.####.', '##..##', '#....#'];
const O_PX = ['.####.', '##..##', '#....#', '#....#', '##..##', '.####.'];
function Mark({ m }: { m: 'X' | 'O' }) {
  const rows = m === 'X' ? X_PX : O_PX;
  return (
    <svg viewBox="-1 -1 8 8" shapeRendering="crispEdges" className="mark" aria-hidden="true">
      {rows.flatMap((r, y) => r.split('').map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={m === 'X' ? 'var(--cyan)' : 'var(--pink)'} /> : null)))}
    </svg>
  );
}

export function TicTacToe() {
  const { addXP } = usePlayer();
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [mode, setMode] = useState<'ai' | 'local'>('ai');
  const [hard, setHard] = useState(false);
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const w = winner(board);
  const draw = !w && board.every(Boolean);

  useEffect(() => {
    if (mode !== 'ai' || turn !== 'O' || w || draw) return;
    const id = setTimeout(() => {
      const i = aiMove(board, hard);
      setBoard((b) => b.map((c, j) => (j === i ? 'O' : c)));
      setTurn('X');
    }, 400);
    return () => clearTimeout(id);
  }, [turn, mode, board, hard, w, draw]);

  useEffect(() => {
    if (w) {
      setScore((s) => ({ ...s, [w.who]: s[w.who] + 1 }));
      if (mode === 'ai' && w.who === 'X') addXP(hard ? 25 : 10, 'ganaste al 3 en raya');
    } else if (draw) setScore((s) => ({ ...s, draw: s.draw + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!w, draw]);

  const play = (i: number) => {
    if (board[i] || w || (mode === 'ai' && turn === 'O')) return;
    setBoard((b) => b.map((c, j) => (j === i ? turn : c)));
    setTurn(turn === 'X' ? 'O' : 'X');
  };
  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
  };

  return (
    <div className="game">
      <div className="game__controls">
        <div className="row row--tight">
          <button className={`chip${mode === 'ai' ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--cyan)' }} onClick={() => (setMode('ai'), reset(), setScore({ X: 0, O: 0, draw: 0 }))}>
            VS MÁQUINA
          </button>
          <button className={`chip${mode === 'local' ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--cyan)' }} onClick={() => (setMode('local'), reset(), setScore({ X: 0, O: 0, draw: 0 }))}>
            2 JUGADORES
          </button>
          {mode === 'ai' && (
            <button className={`chip${hard ? ' is-on' : ''}`} style={{ ['--c' as string]: 'var(--red)' }} onClick={() => setHard(!hard)}>
              {hard ? 'IMBATIBLE' : 'NORMAL'}
            </button>
          )}
        </div>
      </div>
      <p className={`game__status${w || draw ? ' is-over' : ''}`}>
        {w ? `¡GANA ${w.who}!` : draw ? 'EMPATE' : `TURNO: ${turn}${mode === 'ai' && turn === 'O' ? ' (MÁQUINA)' : ''}`}
      </p>
      <div className="ttt">
        {board.map((c, i) => (
          <button key={i} className={`ttt__cell${w?.line.includes(i) ? ' is-win' : ''}`} onClick={() => play(i)} aria-label={`Casilla ${i + 1}${c ? ` ${c}` : ''}`}>
            {c && <Mark m={c} />}
          </button>
        ))}
      </div>
      <div className="scoreboard">
        <span style={{ color: 'var(--cyan)' }}>X {mode === 'ai' ? '(TÚ)' : ''} <b>{score.X}</b></span>
        <span>EMPATES <b>{score.draw}</b></span>
        <span style={{ color: 'var(--pink)' }}>O {mode === 'ai' ? '(CPU)' : ''} <b>{score.O}</b></span>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-sm btn-solid" onClick={reset}>
          <Icon name="reset" /> OTRA
        </button>
      </div>
    </div>
  );
}
