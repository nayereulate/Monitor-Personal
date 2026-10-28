import type { AvatarConfig } from '@/lib/types';

/* =========================================================================
   Avatar pixel-art 12x16 generado a partir de colores (sin imágenes).
   Letras: S piel · E ojos · M boca · T camiseta · P pantalón · B zapatos · H pelo
   ========================================================================= */
const BODY = [
  '............',
  '...SSSSSS...',
  '..SSSSSSSS..',
  '..SSSSSSSS..',
  '..SSESSESS..',
  '..SSSSSSSS..',
  '...SSMMSS...',
  '....SSSS....',
  '..TTTTTTTT..',
  '.TTTTTTTTTT.',
  '.STTTTTTTTS.',
  '.STTTTTTTTS.',
  '..PPPPPPPP..',
  '..PPP..PPP..',
  '..PPP..PPP..',
  '..BBB..BBB..',
];

const HAIR: Record<AvatarConfig['hairStyle'], string[]> = {
  short: ['...HHHHHH...', '..HHHHHHHH..', '..HHHHHHHH..', '..H......H..'],
  long: [
    '...HHHHHH...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HH......HH.',
    '.HH......HH.',
    '.HH......HH.',
    '.HH......HH.',
    '.H........H.',
  ],
  spiky: ['.H..H..H..H.', '.HHHHHHHHHH.', '..HHHHHHHH..', '..H......H..'],
  bald: [],
  cap: ['...HHHHHH...', '..HHHHHHHH..', '..HHHHHHHHHH'],
};

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('');
}

export function avatarPixels(a: AvatarConfig) {
  const colors: Record<string, string> = {
    S: a.skin,
    E: a.eyes,
    M: shade(a.skin, -0.3),
    T: a.shirt,
    P: a.pants,
    B: '#120626',
    H: a.hair,
  };
  const grid = BODY.map((r) => r.split(''));
  HAIR[a.hairStyle].forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      if (ch !== '.') grid[y][x] = ch;
    }),
  );
  const px: { x: number; y: number; fill: string }[] = [];
  grid.forEach((row, y) => row.forEach((ch, x) => ch !== '.' && px.push({ x, y, fill: colors[ch] })));
  return px;
}

/** Píxeles como <rect>; usable dentro de cualquier <svg>. */
export function AvatarRects({ avatar }: { avatar: AvatarConfig }) {
  return (
    <>
      {avatarPixels(avatar).map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1.02} height={1.02} fill={p.fill} />
      ))}
    </>
  );
}

export function PixelAvatar({ avatar, className, title }: { avatar: AvatarConfig; className?: string; title?: string }) {
  return (
    <svg
      className={className}
      viewBox="-1 -1 14 18"
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? 'Avatar'}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <AvatarRects avatar={avatar} />
    </svg>
  );
}

export { shade };
