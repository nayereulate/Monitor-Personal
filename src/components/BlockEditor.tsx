'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { uid } from '@/lib/store';

/* =========================================================================
   Editor de bloques estilo Notion: Enter crea bloque, "/" abre el menú,
   atajos markdown (# , ## , - , [] , > , 1. , ``` , ---).
   ========================================================================= */

export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'number' | 'quote' | 'code' | 'callout' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

export const newBlock = (type: BlockType = 'p', text = ''): Block => ({ id: uid(), type, text });

const MENU: { type: BlockType; label: string; hint: string; icon: string }[] = [
  { type: 'p', label: 'Texto', hint: 'Párrafo normal', icon: '¶' },
  { type: 'h1', label: 'Título 1', hint: '#', icon: 'H1' },
  { type: 'h2', label: 'Título 2', hint: '##', icon: 'H2' },
  { type: 'h3', label: 'Título 3', hint: '###', icon: 'H3' },
  { type: 'todo', label: 'Tarea', hint: '[]', icon: '☐' },
  { type: 'bullet', label: 'Lista', hint: '-', icon: '•' },
  { type: 'number', label: 'Lista numerada', hint: '1.', icon: '1.' },
  { type: 'quote', label: 'Cita', hint: '>', icon: '❝' },
  { type: 'callout', label: 'Aviso', hint: '!', icon: '★' },
  { type: 'code', label: 'Código', hint: '```', icon: '</>' },
  { type: 'divider', label: 'Separador', hint: '---', icon: '—' },
];

const SHORTCUTS: [string, BlockType][] = [
  ['### ', 'h3'],
  ['## ', 'h2'],
  ['# ', 'h1'],
  ['[] ', 'todo'],
  ['- ', 'bullet'],
  ['* ', 'bullet'],
  ['1. ', 'number'],
  ['> ', 'quote'],
  ['! ', 'callout'],
  ['```', 'code'],
  ['---', 'divider'],
];

const CONTINUES: BlockType[] = ['todo', 'bullet', 'number'];

function AutoTextarea({
  value,
  className,
  onChange,
  onKeyDown,
  placeholder,
  inputRef,
}: {
  value: string;
  className: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  inputRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        inputRef(el);
      }}
      rows={1}
      className={className}
      value={value}
      placeholder={placeholder}
      spellCheck
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

export function BlockEditor({ blocks, onChange, accent }: { blocks: Block[]; onChange: (b: Block[]) => void; accent: string }) {
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const [focus, setFocus] = useState<{ id: string; caret: number } | null>(null);
  const [menu, setMenu] = useState<{ id: string; q: string; active: number } | null>(null);

  useEffect(() => {
    if (!focus) return;
    const el = refs.current.get(focus.id);
    if (el) {
      el.focus();
      const c = Math.min(focus.caret, el.value.length);
      el.setSelectionRange(c, c);
    }
    setFocus(null);
  }, [focus, blocks]);

  const list = blocks.length ? blocks : [newBlock()];
  const set = (next: Block[]) => onChange(next);
  const patch = (id: string, p: Partial<Block>) => set(list.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const options = menu ? MENU.filter((m) => (m.label + m.hint).toLowerCase().includes(menu.q.toLowerCase())) : [];

  const applyType = (id: string, type: BlockType) => {
    const idx = list.findIndex((b) => b.id === id);
    if (type === 'divider') {
      const nb = newBlock();
      const next = [...list];
      next[idx] = { ...list[idx], type: 'divider', text: '' };
      next.splice(idx + 1, 0, nb);
      set(next);
      setFocus({ id: nb.id, caret: 0 });
    } else {
      set(list.map((b) => (b.id === id ? { ...b, type, text: menu ? '' : b.text } : b)));
      setFocus({ id, caret: 0 });
    }
    setMenu(null);
  };

  const handleChange = (b: Block, text: string) => {
    if (text.startsWith('/') && !text.includes(' ') && b.type !== 'code') {
      setMenu({ id: b.id, q: text.slice(1), active: 0 });
    } else if (menu?.id === b.id) setMenu(null);

    if (b.type === 'p') {
      for (const [prefix, type] of SHORTCUTS) {
        if (text.startsWith(prefix)) {
          if (type === 'divider') {
            const idx = list.findIndex((x) => x.id === b.id);
            const nb = newBlock();
            const next = [...list];
            next[idx] = { ...b, type: 'divider', text: '' };
            next.splice(idx + 1, 0, nb);
            set(next);
            setFocus({ id: nb.id, caret: 0 });
            return;
          }
          patch(b.id, { type, text: text.slice(prefix.length) });
          return;
        }
      }
    }
    patch(b.id, { text });
  };

  const handleKey = (b: Block, idx: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (menu?.id === b.id && options.length) {
      if (e.key === 'ArrowDown') return (e.preventDefault(), setMenu({ ...menu, active: (menu.active + 1) % options.length }));
      if (e.key === 'ArrowUp') return (e.preventDefault(), setMenu({ ...menu, active: (menu.active - 1 + options.length) % options.length }));
      if (e.key === 'Enter') return (e.preventDefault(), applyType(b.id, options[menu.active].type));
      if (e.key === 'Escape') return setMenu(null);
    }

    if (e.key === 'Enter' && !e.shiftKey && b.type !== 'code') {
      e.preventDefault();
      if (!b.text && b.type !== 'p') return patch(b.id, { type: 'p' });
      const caret = el.selectionStart;
      const nb = newBlock(CONTINUES.includes(b.type) ? b.type : 'p', b.text.slice(caret));
      const next = [...list];
      next[idx] = { ...b, text: b.text.slice(0, caret) };
      next.splice(idx + 1, 0, nb);
      set(next);
      setFocus({ id: nb.id, caret: 0 });
      return;
    }
    if (e.key === 'Enter' && e.ctrlKey && b.type === 'code') {
      e.preventDefault();
      const nb = newBlock();
      const next = [...list];
      next.splice(idx + 1, 0, nb);
      set(next);
      setFocus({ id: nb.id, caret: 0 });
      return;
    }
    if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (b.type !== 'p') {
        e.preventDefault();
        return patch(b.id, { type: 'p' });
      }
      if (idx > 0) {
        e.preventDefault();
        let prevIdx = idx - 1;
        const next = [...list];
        if (next[prevIdx].type === 'divider') {
          next.splice(prevIdx, 1);
          set(next);
          return setFocus({ id: b.id, caret: 0 });
        }
        const prev = next[prevIdx];
        next[prevIdx] = { ...prev, text: prev.text + b.text };
        next.splice(idx, 1);
        set(next);
        setFocus({ id: prev.id, caret: prev.text.length });
      }
      return;
    }
    if (e.key === 'ArrowUp' && el.selectionStart === 0 && idx > 0) {
      const prev = [...list.slice(0, idx)].reverse().find((x) => x.type !== 'divider');
      if (prev) (e.preventDefault(), setFocus({ id: prev.id, caret: prev.text.length }));
    }
    if (e.key === 'ArrowDown' && el.selectionEnd === el.value.length && idx < list.length - 1) {
      const nxt = list.slice(idx + 1).find((x) => x.type !== 'divider');
      if (nxt) (e.preventDefault(), setFocus({ id: nxt.id, caret: 0 }));
    }
  };

  let num = 0;
  return (
    <div className="blocks" style={{ ['--accent' as string]: accent }}>
      {list.map((b, idx) => {
        num = b.type === 'number' ? num + 1 : 0;
        if (b.type === 'divider')
          return (
            <div key={b.id} className="block block--divider">
              <hr />
              <button className="block__x" onClick={() => set(list.filter((x) => x.id !== b.id))} aria-label="Quitar separador">
                ×
              </button>
            </div>
          );
        return (
          <div key={b.id} className={`block block--${b.type}${b.checked ? ' is-checked' : ''}`}>
            {b.type === 'todo' && <input type="checkbox" checked={!!b.checked} onChange={(e) => patch(b.id, { checked: e.target.checked })} aria-label="Hecho" />}
            {b.type === 'bullet' && <span className="block__marker">■</span>}
            {b.type === 'number' && <span className="block__marker">{num}.</span>}
            {b.type === 'callout' && <span className="block__marker">★</span>}
            <AutoTextarea
              className="block__input"
              value={b.text}
              placeholder={idx === 0 && list.length === 1 ? "Escribe algo, o '/' para comandos..." : b.type === 'p' ? '' : MENU.find((m) => m.type === b.type)?.label}
              inputRef={(el) => (el ? refs.current.set(b.id, el) : refs.current.delete(b.id))}
              onChange={(t) => handleChange(b, t)}
              onKeyDown={(e) => handleKey(b, idx, e)}
            />
            {menu?.id === b.id && options.length > 0 && (
              <ul className="slash-menu" role="listbox">
                {options.map((o, i) => (
                  <li
                    key={o.type}
                    role="option"
                    aria-selected={i === menu.active}
                    className={i === menu.active ? 'is-active' : ''}
                    onMouseDown={(e) => (e.preventDefault(), applyType(b.id, o.type))}
                  >
                    <span className="slash-menu__icon">{o.icon}</span>
                    <span className="grow">{o.label}</span>
                    <span className="dim">{o.hint}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <button
        className="blocks__add"
        onClick={() => {
          const nb = newBlock();
          set([...list, nb]);
          setFocus({ id: nb.id, caret: 0 });
        }}
      >
        + bloque
      </button>
    </div>
  );
}
