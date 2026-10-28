import type { IconName } from '@/components/Icon';

export const BRAND = 'LIFE.EXE';

export interface RoomInfo {
  slug: string;
  name: string;
  icon: IconName;
  color: string;
  floor: string;
  desc: string;
}

/** Salas del hotel. El orden es el del mapa y la navegación. */
export const ROOMS: RoomInfo[] = [
  { slug: 'personaje', name: 'Personaje', icon: 'user', color: 'var(--yellow)', floor: 'Planta 1', desc: 'Tu avatar, peso, altura, atributos y nivel.' },
  { slug: 'estudio', name: 'Estudio', icon: 'book', color: 'var(--cyan)', floor: 'Planta 1', desc: 'Notas estilo Notion y baúl privado de PDFs.' },
  { slug: 'focus', name: 'Sala Focus', icon: 'clock', color: 'var(--pink)', floor: 'Planta 1', desc: 'Pomodoros personalizados que dan XP.' },
  { slug: 'metas', name: 'Quests', icon: 'target', color: 'var(--green)', floor: 'Planta 2', desc: 'Metas, proyectos y misiones con progreso.' },
  { slug: 'horario', name: 'Horario', icon: 'calendar', color: 'var(--orange)', floor: 'Planta 2', desc: 'Tu semana bloque a bloque.' },
  { slug: 'mapa', name: 'Mapa Mental', icon: 'share', color: 'var(--purple)', floor: 'Planta 2', desc: 'Ideas y todo lo tuyo como nodos conectables.' },
  { slug: 'armario', name: 'Armario', icon: 'shirt', color: 'var(--pink)', floor: 'Planta 3', desc: 'Ideas de outfits con fotos y etiquetas.' },
  { slug: 'relax', name: 'Música & Relax', icon: 'music', color: 'var(--cyan)', floor: 'Planta 3', desc: 'Spotify, YouTube, TikTok, sonidos y respiración.' },
  { slug: 'arcade', name: 'Arcade', icon: 'gamepad', color: 'var(--yellow)', floor: 'Planta 3', desc: 'Ajedrez y 3 en raya pixel art.' },
];

export const roomBySlug = (slug: string) => ROOMS.find((r) => r.slug === slug);

/** Para el mapa mental: a qué sala pertenece cada tipo de item */
export const KIND_ROOM: Record<string, string> = {
  note: 'estudio',
  file: 'estudio',
  idea: 'mapa',
  goal: 'metas',
  project: 'metas',
  outfit: 'armario',
  event: 'horario',
  link: 'relax',
  timer: 'focus',
};

export const KIND_LABEL: Record<string, string> = {
  note: 'NOTA',
  file: 'ARCHIVO',
  idea: 'IDEA',
  goal: 'META',
  project: 'PROYECTO',
  outfit: 'OUTFIT',
  event: 'EVENTO',
  link: 'LINK',
  timer: 'POMODORO',
};

export const KIND_COLOR: Record<string, string> = {
  note: '#00f0ff',
  file: '#a9a9d4',
  idea: '#ffe66d',
  goal: '#39ff88',
  project: '#ff8a3d',
  outfit: '#ff2bd6',
  event: '#ff8a3d',
  link: '#00f0ff',
  timer: '#ff2bd6',
};

export const PALETTE = ['#00f0ff', '#ff2bd6', '#a239ff', '#ffe66d', '#39ff88', '#ff8a3d', '#ff4d6d', '#eaf6ff'];
