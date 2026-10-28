# LIFE.EXE

Organiza tu vida como si fueras el personaje de un videojuego retro. Usa el estilo pixel/synthwave de [nayer.dev](https://nayer.dev).

Es un hotel pixel art con habitaciones isométricas. Haz click en los muebles para entrar a cada función o en el suelo para mover a tu avatar.

| Sala | Qué hace |
|---|---|
| **Personaje** | Editor de avatar pixel, altura, peso, IMC, historial de peso, atributos RPG, logros y exportar copia en JSON |
| **Estudio** | Notas estilo Notion con editor de bloques (`/` comandos y atajos `#`, `-`, `[]`, `>`, `1.`, ```` ``` ````, `---`). Cada nota se personaliza con icono, color, portada, fuente y etiquetas. Incluye un **baúl privado** para PDFs, imágenes y documentos |
| **Sala Focus** | Pomodoros predefinidos y personalizados con sonido, notificación, estadísticas semanales y XP. El tiempo sigue aunque cambies de sala |
| **Quests** | Metas con pasos, fecha límite y recompensa de XP, más proyectos en un kanban con arrastrar y soltar |
| **Horario** | Semana con bloques de colores, repetición por días y línea de "ahora" |
| **Mapa Mental** | Ideas y todo lo demás (notas, metas, proyectos, outfits...) como **nodos que puedes arrastrar y conectar** |
| **Armario** | Ideas de outfits con foto privada o URL, prendas, ocasión y paleta. Sin foto, tu avatar se viste con esos colores |
| **Música & Relax** | Tus links de Spotify, YouTube, TikTok, SoundCloud y más con reproductor embebido, mezclador de sonidos ambiente generados y respiración guiada |
| **Arcade** | Ajedrez pixel art contra la máquina (3 niveles) o a 2 jugadores, y 3 en raya |

Para moverte rápido: `Ctrl/Cmd + K` busca en todas las salas y en todo lo que hayas guardado.

## Arrancar

```bash
npm install
npm run dev      # http://localhost:3000
```

Sin configurar nada, la app arranca en **MODO LOCAL**. Es una demo: las cuentas y los datos se guardan solo en ese navegador (los archivos van a IndexedDB).

## Cuentas reales y datos privados (Supabase)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas y las políticas RLS, que hacen que cada usuario solo pueda leer y escribir lo suyo. También crea el bucket privado `vault` para los archivos.
3. Copia `.env.example` a `.env.local` y pon la URL y la `anon key` que encuentras en **Project Settings → API**.
4. Reinicia `npm run dev`. El login ya usará Supabase Auth.

Los PDFs y las fotos se suben a `vault/<id-del-usuario>/...` y se abren con URLs firmadas que caducan en 30 minutos.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Supabase (Auth, Postgres, Storage) · `@xyflow/react` (mapa mental) · `chess.js` (reglas del ajedrez). Los gráficos son SVG generados por código: no hay imágenes externas.

```
src/
  app/            páginas (landing, login, /hotel y una carpeta por sala) + CSS
  components/     IsoRoom (motor isométrico + catálogo de muebles), PixelAvatar,
                  BlockEditor, CommandPalette, juegos...
  lib/            sesión/auth, XP y niveles, almacenamiento (local | supabase)
supabase/         schema.sql
```

Para añadir una sala:
1. Crea `src/app/hotel/<sala>/page.tsx` usando `RoomShell` + `IsoRoom`.
2. Regístrala en `src/lib/rooms.ts`.
3. Guarda sus datos con `useItems('<tipo>')`.
