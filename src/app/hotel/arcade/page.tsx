'use client';

import { useState } from 'react';
import { ChessGame, PixelPiece } from '@/components/games/Chess';
import { TicTacToe } from '@/components/games/TicTacToe';
import { F, IsoRoom, THEMES, W } from '@/components/IsoRoom';
import { RoomShell } from '@/components/RoomShell';
import { Win } from '@/components/Win';
import { usePlayer } from '@/lib/session';

const GAMES = [
  { id: 'chess', label: 'AJEDREZ', desc: 'Contra la máquina (3 niveles) o a dos jugadores.' },
  { id: 'ttt', label: '3 EN RAYA', desc: 'Partidas rápidas. ¿Puedes con el modo imbatible?' },
] as const;

export default function Arcade() {
  const { profile } = usePlayer();
  const [game, setGame] = useState<(typeof GAMES)[number]['id']>('chess');

  return (
    <RoomShell
      slug="arcade"
      scene={
        <IsoRoom
          theme={THEMES.night}
          avatar={profile.avatar}
          walls={[W.neon('right', 0.4, 7.6, '#ffe66d'), W.poster('right', 2, '#ff2bd6'), W.poster('right', 4.4, '#00f0ff'), W.neon('left', 0.4, 7.6, '#ff2bd6')]}
          furni={[
            { id: 'a1', x: 0.2, y: 0.2, boxes: F.arcade('#ff2bd6'), label: '3 EN RAYA', onClick: () => setGame('ttt') },
            { id: 'a2', x: 1.4, y: 0.2, boxes: F.arcade('#00f0ff'), label: '3 EN RAYA', onClick: () => setGame('ttt') },
            { id: 'a3', x: 6.4, y: 0.2, boxes: F.arcade('#ffe66d'), label: 'PRÓXIMAMENTE' },
            { id: 'chess', x: 3.4, y: 3.2, boxes: F.chessTable(), label: 'AJEDREZ', onClick: () => setGame('chess') },
            { id: 'c1', x: 3.4, y: 4.4, boxes: F.chair('#00f0ff') },
            { id: 'c2', x: 4.6, y: 3.2, boxes: F.chair('#ff2bd6') },
            { id: 'rug', x: 2.6, y: 2.4, boxes: F.rug(3, 3, '#3a1d6b') },
            { id: 'bean', x: 0.4, y: 5.6, boxes: F.beanbag('#ffe66d') },
          ]}
        />
      }
    >
      <div className="split">
        <Win title="selecciona_juego" tone="yellow" flush>
          <ul className="game-list">
            {GAMES.map((g) => (
              <li key={g.id}>
                <button className={game === g.id ? 'is-active' : ''} onClick={() => setGame(g.id)}>
                  <span className="game-list__thumb">{g.id === 'chess' ? <PixelPiece type="n" color="w" /> : <PixelPiece type="p" color="b" />}</span>
                  <span>
                    <span className="px" style={{ fontSize: 9 }}>{g.label}</span>
                    <br />
                    <span className="dim" style={{ fontSize: 16 }}>{g.desc}</span>
                  </span>
                </button>
              </li>
            ))}
            <li className="dim" style={{ padding: '10px 14px', fontSize: 16 }}>+ más juegos próximamente</li>
          </ul>
        </Win>
        <Win title={`${game}.rom`} tone="pink">
          {game === 'chess' ? <ChessGame /> : <TicTacToe />}
        </Win>
      </div>
    </RoomShell>
  );
}
