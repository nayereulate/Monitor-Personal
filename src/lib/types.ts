export type Kind =
  | 'note'      // notas del estudio (editor de bloques)
  | 'idea'      // ideas sueltas del mapa mental
  | 'goal'      // metas / quests
  | 'project'   // proyectos (kanban)
  | 'outfit'    // ideas de outfits
  | 'event'     // bloques del horario semanal
  | 'timer'     // presets de pomodoro
  | 'session'   // pomodoros completados
  | 'link'      // enlaces de la sala de música (spotify, youtube, tiktok...)
  | 'file'      // PDFs y archivos del baúl privado
  | 'measure';  // registros de peso

export interface Item<D = any> {
  id: string;
  kind: Kind;
  title: string;
  data: D;
  created_at: string;
  updated_at: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
}

export interface AvatarConfig {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'spiky' | 'bald' | 'cap';
  shirt: string;
  pants: string;
  eyes: string;
}

export interface Attribute {
  name: string;
  value: number; // 0..10
}

export interface Profile {
  display_name: string;
  bio: string;
  avatar: AvatarConfig;
  height_cm: number | null;
  weight_kg: number | null;
  birth_year: number | null;
  xp: number;
  attributes: Attribute[];
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: '#f1c27d',
  hair: '#2b1b3d',
  hairStyle: 'short',
  shirt: '#ff2bd6',
  pants: '#1c0d38',
  eyes: '#09011a',
};

export const DEFAULT_PROFILE: Profile = {
  display_name: 'PLAYER 1',
  bio: '',
  avatar: DEFAULT_AVATAR,
  height_cm: null,
  weight_kg: null,
  birth_year: null,
  xp: 0,
  attributes: [
    { name: 'Fuerza', value: 5 },
    { name: 'Inteligencia', value: 5 },
    { name: 'Creatividad', value: 5 },
    { name: 'Disciplina', value: 5 },
    { name: 'Social', value: 5 },
  ],
};

/* ---------- Niveles ---------- */
export function levelFromXP(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const base = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, base, next, progress: (xp - base) / (next - base) };
}
