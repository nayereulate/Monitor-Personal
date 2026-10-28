'use client';

import { useMemo, useState } from 'react';
import type { AvatarConfig } from '@/lib/types';
import { AvatarRects, shade } from './PixelAvatar';

/* =========================================================================
   Habitación isométrica estilo hotel retro.
   Coordenadas de suelo en "tiles" (gx, gy); alturas en píxeles.
   ========================================================================= */
const TW = 64; // ancho de un tile
const TH = 32; // alto de un tile
const WH = 120; // alto de las paredes

export interface Box {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  color: string;
}

export interface WallDeco {
  /** 'left' = pared sobre el eje gy (gx=0); 'right' = pared sobre el eje gx (gy=0) */
  side: 'left' | 'right';
  from: number;
  to: number;
  bottom: number;
  top: number;
  color: string;
  /** decoraciones internas (marco, cristal...) dibujadas encima */
  inner?: Omit<WallDeco, 'side' | 'inner' | 'id' | 'label' | 'onClick'>[];
  id?: string;
  label?: string;
  onClick?: () => void;
}

export interface Furni {
  id: string;
  label?: string;
  x: number;
  y: number;
  boxes: Box[];
  onClick?: () => void;
}

export interface RoomTheme {
  floorA: string;
  floorB: string;
  wallL: string;
  wallR: string;
}

export const THEMES: Record<string, RoomTheme> = {
  violet: { floorA: '#2a1450', floorB: '#24113f', wallL: '#3a1d6b', wallR: '#2c1554' },
  teal: { floorA: '#0f2f3f', floorB: '#0c2533', wallL: '#164a5c', wallR: '#103947' },
  rose: { floorA: '#3d1236', floorB: '#330f2d', wallL: '#5a1a50', wallR: '#46143f' },
  night: { floorA: '#141032', floorB: '#100c28', wallL: '#211a4d', wallR: '#19143c' },
  wood: { floorA: '#4a2c1c', floorB: '#3f2517', wallL: '#2c1a4a', wallR: '#22143a' },
  mint: { floorA: '#123a2c', floorB: '#0f3024', wallL: '#1b4f43', wallR: '#153f35' },
};

export function IsoRoom({
  cols = 8,
  rows = 8,
  theme = THEMES.violet,
  furni,
  walls = [],
  avatar,
  start = [cols - 2, rows - 2],
  showLabels = true,
}: {
  cols?: number;
  rows?: number;
  theme?: RoomTheme;
  furni: Furni[];
  walls?: WallDeco[];
  avatar?: AvatarConfig;
  start?: [number, number];
  showLabels?: boolean;
}) {
  const ox = rows * (TW / 2) + 4;
  const oy = WH + 24;
  const width = (cols + rows) * (TW / 2) + 8;
  const height = (cols + rows) * (TH / 2) + oy + 16;

  const P = (gx: number, gy: number, z = 0): [number, number] => [ox + (gx - gy) * (TW / 2), oy + (gx + gy) * (TH / 2) - z];
  const pts = (list: [number, number][]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const [pos, setPos] = useState<[number, number]>(start);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  // tiles ocupados por muebles (el avatar no camina encima)
  const blocked = useMemo(() => {
    const set = new Set<string>();
    furni.forEach((f) =>
      f.boxes.forEach((b) => {
        if (b.h <= 2) return; // alfombras sí se pisan
        for (let i = Math.floor(f.x + b.x); i < Math.ceil(f.x + b.x + b.w); i++)
          for (let j = Math.floor(f.y + b.y); j < Math.ceil(f.y + b.y + b.d); j++) set.add(`${i},${j}`);
      }),
    );
    return set;
  }, [furni]);

  const showLabel = (gx: number, gy: number, z: number, text?: string) => {
    if (!text || !showLabels) return;
    const [x, y] = P(gx, gy, z);
    setHover({ x: (x / width) * 100, y: (y / height) * 100, text });
  };

  const drawBox = (b: Box, fx: number, fy: number, key: string) => {
    const x = fx + b.x;
    const y = fy + b.y;
    const z0 = b.z ?? 0;
    const z1 = z0 + b.h;
    const top = pts([P(x, y, z1), P(x + b.w, y, z1), P(x + b.w, y + b.d, z1), P(x, y + b.d, z1)]);
    const left = pts([P(x, y + b.d, z0), P(x + b.w, y + b.d, z0), P(x + b.w, y + b.d, z1), P(x, y + b.d, z1)]);
    const right = pts([P(x + b.w, y, z0), P(x + b.w, y + b.d, z0), P(x + b.w, y + b.d, z1), P(x + b.w, y, z1)]);
    return (
      <g key={key}>
        <polygon points={left} fill={shade(b.color, -0.22)} />
        <polygon points={right} fill={shade(b.color, -0.4)} />
        <polygon points={top} fill={b.color} />
      </g>
    );
  };

  const wallPoly = (w: Omit<WallDeco, 'inner'>) =>
    w.side === 'right'
      ? pts([P(w.from, 0, w.bottom), P(w.to, 0, w.bottom), P(w.to, 0, w.top), P(w.from, 0, w.top)])
      : pts([P(0, w.from, w.bottom), P(0, w.to, w.bottom), P(0, w.to, w.top), P(0, w.from, w.top)]);

  // Orden de pintado: de atrás (gx+gy menor) hacia delante
  const drawables = [
    ...furni.map((f) => ({
      depth: Math.max(...f.boxes.map((b) => f.x + b.x + b.w + f.y + b.y + b.d)) - (f.boxes.every((b) => b.h <= 2) ? 100 : 0),
      el: (
        <g
          key={f.id}
          className={f.onClick ? 'furni' : undefined}
          onClick={f.onClick}
          onKeyDown={(e) => f.onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), f.onClick())}
          tabIndex={f.onClick ? 0 : undefined}
          role={f.onClick ? 'button' : undefined}
          aria-label={f.label}
          onMouseEnter={() =>
            showLabel(
              f.x + Math.max(...f.boxes.map((b) => b.x + b.w)) / 2,
              f.y + Math.max(...f.boxes.map((b) => b.y + b.d)) / 2,
              Math.max(...f.boxes.map((b) => (b.z ?? 0) + b.h)) + 8,
              f.label,
            )
          }
          onMouseLeave={() => setHover(null)}
          onFocus={() => showLabel(f.x + 0.5, f.y + 0.5, 60, f.label)}
          onBlur={() => setHover(null)}
        >
          {f.boxes.map((b, i) => drawBox(b, f.x, f.y, `${f.id}-${i}`))}
        </g>
      ),
    })),
    ...(avatar
      ? [
          {
            depth: pos[0] + pos[1] + 1.2,
            el: (() => {
              const [ax, ay] = P(pos[0] + 0.5, pos[1] + 0.5);
              const s = 3.4;
              return (
                <g key="avatar" className="iso-avatar" style={{ transform: `translate(${ax - 6 * s}px, ${ay - 16 * s + 4}px)` }}>
                  <ellipse cx={6 * s} cy={16 * s - 2} rx={5 * s} ry={1.6 * s} fill="rgba(0,0,0,.35)" />
                  <g transform={`scale(${s})`}>
                    <AvatarRects avatar={avatar} />
                  </g>
                </g>
              );
            })(),
          },
        ]
      : []),
  ].sort((a, b) => a.depth - b.depth);

  return (
    <div className="iso-scene">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* paredes */}
        <polygon points={pts([P(0, 0), P(0, rows), P(0, rows, WH), P(0, 0, WH)])} fill={theme.wallL} />
        <polygon points={pts([P(0, 0), P(cols, 0), P(cols, 0, WH), P(0, 0, WH)])} fill={theme.wallR} />
        <polygon points={pts([P(0, rows, WH), P(0, 0, WH), P(cols, 0, WH), P(cols, 0, WH + 6), P(0, 0, WH + 6), P(0, rows, WH + 6)])} fill={shade(theme.wallL, 0.35)} />
        <polyline points={pts([P(0, rows), P(0, 0), P(cols, 0)])} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={2} />
        {walls.map((w, i) => (
          <g
            key={w.id ?? i}
            className={w.onClick ? 'furni' : undefined}
            onClick={w.onClick}
            tabIndex={w.onClick ? 0 : undefined}
            role={w.onClick ? 'button' : undefined}
            aria-label={w.label}
            onKeyDown={(e) => w.onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), w.onClick())}
            onMouseEnter={() => w.side === 'right' ? showLabel((w.from + w.to) / 2, 0, w.top + 6, w.label) : showLabel(0, (w.from + w.to) / 2, w.top + 6, w.label)}
            onMouseLeave={() => setHover(null)}
          >
            <polygon points={wallPoly(w)} fill={w.color} />
            {w.inner?.map((inner, j) => <polygon key={j} points={wallPoly({ ...inner, side: w.side })} fill={inner.color} />)}
          </g>
        ))}

        {/* suelo */}
        {Array.from({ length: cols }, (_, gx) =>
          Array.from({ length: rows }, (_, gy) => (
            <polygon
              key={`${gx}-${gy}`}
              className="tile"
              points={pts([P(gx, gy), P(gx + 1, gy), P(gx + 1, gy + 1), P(gx, gy + 1)])}
              fill={(gx + gy) % 2 ? theme.floorA : theme.floorB}
              stroke="rgba(0,0,0,.18)"
              strokeWidth={1}
              onClick={() => avatar && !blocked.has(`${gx},${gy}`) && setPos([gx, gy])}
            />
          )),
        )}

        {drawables.map((d) => d.el)}
      </svg>
      {hover && (
        <span className="iso-label" style={{ left: `${hover.x}%`, top: `${hover.y}%` }}>
          {hover.text}
        </span>
      )}
    </div>
  );
}

/* =========================================================================
   Catálogo de muebles (cajas isométricas). Coordenadas relativas al mueble.
   ========================================================================= */
const WOOD = '#8a5a3c';
const DARK = '#2a1a3d';

export const F = {
  rug: (w: number, d: number, color: string): Box[] => [{ x: 0, y: 0, w, d, h: 1, color }],
  desk: (color = WOOD): Box[] => [
    { x: 0.05, y: 0.1, w: 0.1, d: 0.1, h: 30, color: DARK },
    { x: 1.85, y: 0.1, w: 0.1, d: 0.1, h: 30, color: DARK },
    { x: 0.05, y: 0.8, w: 0.1, d: 0.1, h: 30, color: DARK },
    { x: 1.85, y: 0.8, w: 0.1, d: 0.1, h: 30, color: DARK },
    { x: 0, y: 0, w: 2, d: 1, h: 5, z: 30, color },
    { x: 0.6, y: 0.15, w: 0.8, d: 0.08, h: 24, z: 35, color: '#1a1030' }, // pantalla
    { x: 0.64, y: 0.24, w: 0.72, d: 0.02, h: 19, z: 38, color: '#00c8d6' },
    { x: 0.6, y: 0.45, w: 0.8, d: 0.3, h: 2, z: 35, color: '#a9a9d4' }, // teclado
    { x: 1.55, y: 0.25, w: 0.3, d: 0.4, h: 10, z: 35, color: '#ff2bd6' }, // libros
  ],
  chair: (color = '#ff2bd6'): Box[] => [
    { x: 0.25, y: 0.25, w: 0.5, d: 0.5, h: 18, color: DARK },
    { x: 0.15, y: 0.15, w: 0.7, d: 0.7, h: 5, z: 18, color },
    { x: 0.15, y: 0.75, w: 0.7, d: 0.1, h: 26, z: 18, color },
  ],
  bookshelf: (): Box[] => [
    { x: 0, y: 0, w: 1.4, d: 0.45, h: 92, color: WOOD },
    { x: 0.08, y: 0.4, w: 0.35, d: 0.06, h: 18, z: 64, color: '#00f0ff' },
    { x: 0.5, y: 0.4, w: 0.4, d: 0.06, h: 16, z: 64, color: '#ffe66d' },
    { x: 0.95, y: 0.4, w: 0.35, d: 0.06, h: 18, z: 64, color: '#ff2bd6' },
    { x: 0.08, y: 0.4, w: 0.5, d: 0.06, h: 18, z: 36, color: '#a239ff' },
    { x: 0.7, y: 0.4, w: 0.6, d: 0.06, h: 16, z: 36, color: '#39ff88' },
    { x: 0.08, y: 0.4, w: 1.2, d: 0.06, h: 16, z: 8, color: '#ff8a3d' },
  ],
  plant: (): Box[] => [
    { x: 0.3, y: 0.3, w: 0.4, d: 0.4, h: 14, color: '#c0603a' },
    { x: 0.2, y: 0.2, w: 0.6, d: 0.6, h: 18, z: 14, color: '#2fbf6a' },
    { x: 0.32, y: 0.32, w: 0.36, d: 0.36, h: 14, z: 32, color: '#39ff88' },
  ],
  lamp: (color = '#ffe66d'): Box[] => [
    { x: 0.35, y: 0.35, w: 0.3, d: 0.3, h: 4, color: DARK },
    { x: 0.46, y: 0.46, w: 0.08, d: 0.08, h: 56, z: 4, color: DARK },
    { x: 0.25, y: 0.25, w: 0.5, d: 0.5, h: 16, z: 56, color },
  ],
  bed: (color = '#00f0ff'): Box[] => [
    { x: 0, y: 0, w: 1.4, d: 2.4, h: 14, color: WOOD },
    { x: 0.05, y: 0.05, w: 1.3, d: 2.3, h: 8, z: 14, color: '#eaf6ff' },
    { x: 0.05, y: 0.8, w: 1.3, d: 1.55, h: 10, z: 14, color },
    { x: 0.15, y: 0.15, w: 1.1, d: 0.5, h: 6, z: 22, color: '#ffffff' },
    { x: 0, y: 0, w: 1.4, d: 0.12, h: 40, color: WOOD },
  ],
  sofa: (color = '#a239ff', w = 2.2): Box[] => [
    { x: 0, y: 0, w, d: 1, h: 18, color },
    { x: 0, y: 0, w, d: 0.25, h: 38, color: shade(color, -0.1) },
    { x: 0, y: 0, w: 0.25, d: 1, h: 28, color: shade(color, 0.08) },
    { x: w - 0.25, y: 0, w: 0.25, d: 1, h: 28, color: shade(color, 0.08) },
  ],
  table: (color = WOOD, w = 1, d = 1): Box[] => [
    { x: w / 2 - 0.08, y: d / 2 - 0.08, w: 0.16, d: 0.16, h: 24, color: DARK },
    { x: 0, y: 0, w, d, h: 5, z: 24, color },
  ],
  chessTable: (): Box[] => {
    const boxes: Box[] = [
      { x: 0.42, y: 0.42, w: 0.16, d: 0.16, h: 24, color: DARK },
      { x: 0, y: 0, w: 1, d: 1, h: 4, z: 24, color: WOOD },
    ];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        boxes.push({ x: 0.1 + i * 0.2, y: 0.1 + j * 0.2, w: 0.2, d: 0.2, h: 1, z: 28, color: (i + j) % 2 ? '#eaf6ff' : '#1a1030' });
    boxes.push({ x: 0.2, y: 0.2, w: 0.08, d: 0.08, h: 8, z: 29, color: '#ff2bd6' });
    boxes.push({ x: 0.7, y: 0.65, w: 0.08, d: 0.08, h: 10, z: 29, color: '#00f0ff' });
    return boxes;
  },
  arcade: (color = '#ff2bd6'): Box[] => [
    { x: 0, y: 0, w: 0.9, d: 0.9, h: 80, color: '#1a1030' },
    { x: 0, y: 0.9, w: 0.9, d: 0.04, h: 80, color },
    { x: 0.1, y: 0.94, w: 0.7, d: 0.02, h: 26, z: 44, color: '#00f0ff' },
    { x: 0.05, y: 0.9, w: 0.8, d: 0.3, h: 4, z: 34, color: '#2a1a3d' },
    { x: 0.2, y: 1.0, w: 0.1, d: 0.1, h: 6, z: 38, color: '#ffe66d' },
    { x: 0.55, y: 1.0, w: 0.1, d: 0.1, h: 4, z: 38, color: '#39ff88' },
  ],
  tv: (): Box[] => [
    { x: 0, y: 0, w: 1.6, d: 0.6, h: 20, color: WOOD },
    { x: 0.15, y: 0.15, w: 1.3, d: 0.12, h: 44, z: 20, color: '#1a1030' },
    { x: 0.2, y: 0.27, w: 1.2, d: 0.02, h: 36, z: 24, color: '#a239ff' },
  ],
  speaker: (): Box[] => [
    { x: 0.15, y: 0.15, w: 0.6, d: 0.6, h: 50, color: '#1a1030' },
    { x: 0.25, y: 0.75, w: 0.4, d: 0.02, h: 14, z: 30, color: '#ff2bd6' },
    { x: 0.3, y: 0.75, w: 0.3, d: 0.02, h: 10, z: 10, color: '#00f0ff' },
  ],
  turntable: (): Box[] => [
    { x: 0, y: 0, w: 1, d: 0.8, h: 24, color: WOOD },
    { x: 0.05, y: 0.05, w: 0.9, d: 0.7, h: 4, z: 24, color: '#1a1030' },
    { x: 0.2, y: 0.15, w: 0.5, d: 0.5, h: 2, z: 28, color: '#ff2bd6' },
  ],
  beanbag: (color = '#00f0ff'): Box[] => [
    { x: 0.1, y: 0.1, w: 0.8, d: 0.8, h: 12, color },
    { x: 0.2, y: 0.2, w: 0.6, d: 0.6, h: 8, z: 12, color: shade(color, 0.15) },
  ],
  wardrobe: (color = WOOD): Box[] => [
    { x: 0, y: 0, w: 1.6, d: 0.6, h: 96, color },
    { x: 0.78, y: 0.6, w: 0.04, d: 0.02, h: 90, z: 3, color: shade(color, -0.4) },
    { x: 0.65, y: 0.6, w: 0.06, d: 0.04, h: 8, z: 46, color: '#ffe66d' },
    { x: 0.9, y: 0.6, w: 0.06, d: 0.04, h: 8, z: 46, color: '#ffe66d' },
  ],
  rack: (): Box[] => [
    { x: 0, y: 0.4, w: 0.08, d: 0.08, h: 64, color: '#a9a9d4' },
    { x: 1.72, y: 0.4, w: 0.08, d: 0.08, h: 64, color: '#a9a9d4' },
    { x: 0, y: 0.4, w: 1.8, d: 0.08, h: 3, z: 64, color: '#a9a9d4' },
    { x: 0.2, y: 0.3, w: 0.3, d: 0.3, h: 34, z: 28, color: '#ff2bd6' },
    { x: 0.6, y: 0.3, w: 0.3, d: 0.3, h: 30, z: 32, color: '#00f0ff' },
    { x: 1.0, y: 0.3, w: 0.3, d: 0.3, h: 38, z: 24, color: '#ffe66d' },
    { x: 1.4, y: 0.3, w: 0.25, d: 0.3, h: 32, z: 30, color: '#39ff88' },
  ],
  mirror: (): Box[] => [
    { x: 0.2, y: 0.2, w: 0.6, d: 0.1, h: 80, color: '#ffe66d' },
    { x: 0.25, y: 0.3, w: 0.5, d: 0.02, h: 70, z: 5, color: '#9fe8ff' },
  ],
  scale: (): Box[] => [{ x: 0.2, y: 0.2, w: 0.6, d: 0.6, h: 4, color: '#eaf6ff' }, { x: 0.35, y: 0.6, w: 0.3, d: 0.1, h: 1, z: 4, color: '#00f0ff' }],
  dumbbell: (): Box[] => [
    { x: 0.2, y: 0.4, w: 0.15, d: 0.2, h: 10, color: '#2a1a3d' },
    { x: 0.35, y: 0.47, w: 0.3, d: 0.06, h: 4, z: 3, color: '#a9a9d4' },
    { x: 0.65, y: 0.4, w: 0.15, d: 0.2, h: 10, color: '#2a1a3d' },
  ],
  board: (color = '#eaf6ff'): Box[] => [
    { x: 0.1, y: 0.4, w: 0.08, d: 0.08, h: 70, color: DARK },
    { x: 1.6, y: 0.4, w: 0.08, d: 0.08, h: 70, color: DARK },
    { x: 0, y: 0.38, w: 1.8, d: 0.06, h: 48, z: 30, color },
    { x: 0.2, y: 0.44, w: 0.4, d: 0.01, h: 12, z: 58, color: '#ffe66d' },
    { x: 0.8, y: 0.44, w: 0.5, d: 0.01, h: 12, z: 44, color: '#ff2bd6' },
    { x: 0.3, y: 0.44, w: 0.6, d: 0.01, h: 10, z: 36, color: '#00f0ff' },
  ],
  trophy: (): Box[] => [
    { x: 0.25, y: 0.25, w: 0.5, d: 0.5, h: 30, color: '#3b2a5c' },
    { x: 0.35, y: 0.35, w: 0.3, d: 0.3, h: 8, z: 30, color: '#ffe66d' },
    { x: 0.3, y: 0.3, w: 0.4, d: 0.4, h: 12, z: 38, color: '#ffd23d' },
  ],
  calendar: (): Box[] => [
    { x: 0, y: 0, w: 1, d: 0.6, h: 30, color: WOOD },
    { x: 0.2, y: 0.15, w: 0.6, d: 0.08, h: 22, z: 30, color: '#eaf6ff' },
    { x: 0.2, y: 0.15, w: 0.6, d: 0.08, h: 6, z: 46, color: '#ff4d6d' },
  ],
  clock: (): Box[] => [
    { x: 0.3, y: 0.3, w: 0.4, d: 0.4, h: 90, color: WOOD },
    { x: 0.35, y: 0.7, w: 0.3, d: 0.02, h: 20, z: 60, color: '#ffe66d' },
  ],
  hourglass: (): Box[] => [
    { x: 0.3, y: 0.3, w: 0.4, d: 0.4, h: 4, color: WOOD },
    { x: 0.38, y: 0.38, w: 0.24, d: 0.24, h: 12, z: 4, color: '#9fe8ff' },
    { x: 0.45, y: 0.45, w: 0.1, d: 0.1, h: 6, z: 16, color: '#ffe66d' },
    { x: 0.38, y: 0.38, w: 0.24, d: 0.24, h: 12, z: 22, color: '#9fe8ff' },
    { x: 0.3, y: 0.3, w: 0.4, d: 0.4, h: 4, z: 34, color: WOOD },
  ],
  nodes: (): Box[] => [
    { x: 0.1, y: 0.1, w: 0.3, d: 0.3, h: 30, color: '#00f0ff' },
    { x: 0.6, y: 0.2, w: 0.3, d: 0.3, h: 46, color: '#ff2bd6' },
    { x: 0.3, y: 0.6, w: 0.3, d: 0.3, h: 22, color: '#ffe66d' },
    { x: 0.2, y: 0.2, w: 0.6, d: 0.06, h: 3, z: 26, color: '#a9a9d4' },
  ],
  door: (): Box[] => [{ x: 0, y: 0, w: 1, d: 0.1, h: 70, color: '#5a3a28' }],
};

/** Decoraciones de pared listas para usar */
export const W = {
  window: (side: WallDeco['side'], from: number, extra: Partial<WallDeco> = {}): WallDeco => ({
    side,
    from,
    to: from + 1.6,
    bottom: 40,
    top: 100,
    color: '#5a3a28',
    inner: [
      { from: from + 0.1, to: from + 0.75, bottom: 46, top: 94, color: '#1b1660' },
      { from: from + 0.85, to: from + 1.5, bottom: 46, top: 94, color: '#1b1660' },
      { from: from + 0.2, to: from + 0.3, bottom: 80, top: 84, color: '#ffe66d' },
      { from: from + 1.1, to: from + 1.15, bottom: 60, top: 63, color: '#eaf6ff' },
    ],
    ...extra,
  }),
  poster: (side: WallDeco['side'], from: number, color: string, extra: Partial<WallDeco> = {}): WallDeco => ({
    side,
    from,
    to: from + 0.9,
    bottom: 50,
    top: 98,
    color,
    inner: [
      { from: from + 0.15, to: from + 0.75, bottom: 72, top: 90, color: shade(color, 0.45) },
      { from: from + 0.15, to: from + 0.55, bottom: 58, top: 64, color: shade(color, -0.45) },
    ],
    ...extra,
  }),
  shelf: (side: WallDeco['side'], from: number, extra: Partial<WallDeco> = {}): WallDeco => ({
    side,
    from,
    to: from + 1.4,
    bottom: 62,
    top: 66,
    color: '#8a5a3c',
    inner: [
      { from: from + 0.1, to: from + 0.3, bottom: 66, top: 82, color: '#00f0ff' },
      { from: from + 0.35, to: from + 0.5, bottom: 66, top: 78, color: '#ff2bd6' },
      { from: from + 0.9, to: from + 1.2, bottom: 66, top: 74, color: '#39ff88' },
    ],
    ...extra,
  }),
  neon: (side: WallDeco['side'], from: number, to: number, color: string, extra: Partial<WallDeco> = {}): WallDeco => ({
    side,
    from,
    to,
    bottom: 104,
    top: 108,
    color,
    ...extra,
  }),
};
