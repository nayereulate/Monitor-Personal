'use client';

import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge as FlowEdge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { RoomShell } from '@/components/RoomShell';
import { Win } from '@/components/Win';
import { KIND_COLOR, KIND_LABEL, KIND_ROOM, PALETTE } from '@/lib/rooms';
import { onStoreChange } from '@/lib/store';
import { usePlayer, useStore } from '@/lib/session';
import type { Edge, Item, Kind } from '@/lib/types';

const MAP_KINDS: Kind[] = ['idea', 'note', 'goal', 'project', 'outfit', 'event', 'file', 'link'];

type NodeData = { item: Item; color: string };

function PixelNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const { item, color } = data;
  return (
    <div className={`pnode${selected ? ' is-sel' : ''}`} style={{ ['--c' as string]: color }}>
      <Handle type="target" position={Position.Left} />
      <span className="pnode__kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
      <span className="pnode__title">{item.title || 'Sin título'}</span>
      {item.kind === 'idea' && item.data.text && <span className="pnode__text">{String(item.data.text).slice(0, 90)}</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { pixel: PixelNode };

function defaultPos(kind: Kind, i: number) {
  const col = MAP_KINDS.indexOf(kind);
  return { x: col * 260 + (i % 2) * 40, y: i * 110 };
}

function MindMap() {
  const store = useStore();
  const { addXP } = usePlayer();
  const params = useSearchParams();
  const flow = useReactFlow();
  const [items, setItems] = useState<Item[]>([]);
  const [links, setLinks] = useState<Edge[]>([]);
  const [visible, setVisible] = useState<Set<Kind>>(new Set(['idea', 'note', 'goal', 'project']));
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selected, setSelected] = useState<string | null>(params.get('open'));
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState('#ffe66d');

  const load = useCallback(async () => {
    const [it, ed] = await Promise.all([store.listItems(MAP_KINDS), store.listEdges()]);
    setItems(it);
    setLinks(ed);
  }, [store]);
  useEffect(() => {
    load();
    return onStoreChange(load);
  }, [load]);

  // items → nodos
  useEffect(() => {
    const counters: Record<string, number> = {};
    setNodes((prev) => {
      const sel = new Set(prev.filter((n) => n.selected).map((n) => n.id));
      return items
        .filter((i) => visible.has(i.kind))
        .map((i) => {
          counters[i.kind] = (counters[i.kind] ?? 0) + 1;
          return {
            id: i.id,
            type: 'pixel',
            position: i.data?.pos ?? defaultPos(i.kind, counters[i.kind] - 1),
            data: { item: i, color: i.data?.color ?? KIND_COLOR[i.kind] ?? '#00f0ff' },
            selected: sel.has(i.id),
            deletable: i.kind === 'idea',
          };
        });
    });
  }, [items, visible, setNodes]);

  useEffect(() => {
    const shown = new Set(items.filter((i) => visible.has(i.kind)).map((i) => i.id));
    setEdges(
      links
        .filter((l) => shown.has(l.source) && shown.has(l.target))
        .map((l) => ({ id: l.id, source: l.source, target: l.target, label: l.label ?? undefined, type: 'smoothstep', animated: true })),
    );
  }, [links, items, visible, setEdges]);

  const onConnect = useCallback(
    async (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      if (links.some((l) => (l.source === c.source && l.target === c.target) || (l.source === c.target && l.target === c.source))) return;
      await store.createEdge(c.source, c.target);
      if (links.length === 0) addXP(10, 'primera conexión');
    },
    [store, links, addXP],
  );

  const savePos = useCallback(
    async (_: unknown, node: Node<NodeData>) => {
      const it = items.find((i) => i.id === node.id);
      if (it) await store.updateItem(it.id, { data: { ...it.data, pos: node.position } });
    },
    [items, store],
  );

  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    // centro del lienzo visible + un hueco libre para no tapar otros nodos
    const rect = document.querySelector('.mindmap__canvas')!.getBoundingClientRect();
    const c = flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const taken = (x: number, y: number) => nodes.some((n) => Math.abs(n.position.x - x) < 210 && Math.abs(n.position.y - y) < 100);
    let pos = { x: c.x - 95, y: c.y - 30 };
    for (let r = 1; taken(pos.x, pos.y) && r < 40; r++) {
      const a = r * 2.4;
      pos = { x: c.x - 95 + Math.cos(a) * 60 * r, y: c.y - 30 + Math.sin(a) * 40 * r };
    }
    const it = await store.createItem('idea', draft.trim(), { text: '', color, pos });
    flow.setCenter(pos.x + 95, pos.y + 30, { zoom: flow.getZoom(), duration: 300 });
    setDraft('');
    setSelected(it.id);
    if (!items.some((i) => i.kind === 'idea')) addXP(10, 'primera idea');
  };

  const sel = items.find((i) => i.id === selected);
  const counts = useMemo(() => Object.fromEntries(MAP_KINDS.map((k) => [k, items.filter((i) => i.kind === k).length])), [items]);

  return (
    <div className="mindmap">
      <div className="mindmap__bar">
        <form className="row row--tight grow" onSubmit={addIdea}>
          <input className="input grow" style={{ minWidth: 180 }} placeholder="Nueva idea + Enter" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="swatches">
            {PALETTE.slice(0, 6).map((c) => (
              <button type="button" key={c} className={`swatch${c === color ? ' is-on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
          <button className="btn btn-sm btn-solid">
            <Icon name="bulb" /> IDEA
          </button>
        </form>
        <div className="row row--tight">
          {MAP_KINDS.map((k) => (
            <button
              key={k}
              className={`chip${visible.has(k) ? ' is-on' : ''}`}
              style={{ ['--c' as string]: KIND_COLOR[k] }}
              onClick={() => {
                const next = new Set(visible);
                if (next.has(k)) next.delete(k);
                else next.add(k);
                setVisible(next);
              }}
            >
              {KIND_LABEL[k]} {counts[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="mindmap__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={savePos}
          onNodeClick={(_, n) => setSelected(n.id)}
          onPaneClick={() => setSelected(null)}
          onNodesDelete={(ns) => ns.forEach((n) => store.deleteItem(n.id))}
          onEdgesDelete={(es) => es.forEach((e) => store.deleteEdge(e.id))}
          onEdgeDoubleClick={(_, e) => store.deleteEdge(e.id)}
          deleteKeyCode={['Delete', 'Backspace']}
          colorMode="dark"
          fitView
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Lines} gap={32} color="rgba(255,43,214,.12)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(n) => (n.data as NodeData).color} maskColor="rgba(9,1,26,.7)" />
        </ReactFlow>

        {sel && (
          <div className="mindmap__panel">
            <SidePanel key={sel.id} item={sel} links={links} items={items} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
      <p className="dim" style={{ fontSize: 15, margin: '8px 0 0' }}>
        Arrastra desde el punto derecho de un nodo hasta otro para conectarlos · doble click en una conexión para borrarla · Supr borra ideas seleccionadas
      </p>
    </div>
  );
}

function SidePanel({ item, links, items, onClose }: { item: Item; links: Edge[]; items: Item[]; onClose: () => void }) {
  const store = useStore();
  const [title, setTitle] = useState(item.title);
  const [text, setText] = useState<string>(item.data.text ?? '');
  const related = links
    .filter((l) => l.source === item.id || l.target === item.id)
    .map((l) => ({ link: l, other: items.find((i) => i.id === (l.source === item.id ? l.target : l.source)) }))
    .filter((r) => r.other);

  const save = (patch: { title?: string; data?: object }) => store.updateItem(item.id, { ...patch, data: patch.data ? { ...item.data, ...patch.data } : undefined });

  return (
    <Win title={`${KIND_LABEL[item.kind]} · ${item.title || 'sin título'}`} actions={<button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>}>
      <div className="stack">
        {item.kind === 'idea' ? (
          <>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== item.title && save({ title })} />
            <textarea className="textarea" rows={5} placeholder="Desarrolla la idea..." value={text} onChange={(e) => setText(e.target.value)} onBlur={() => save({ data: { text } })} />
            <div className="swatches">
              {PALETTE.map((c) => (
                <button key={c} className={`swatch${c === item.data.color ? ' is-on' : ''}`} style={{ background: c }} onClick={() => save({ data: { color: c } })} aria-label={c} />
              ))}
            </div>
          </>
        ) : (
          <Link className="btn btn-sm btn-cyan" href={`/hotel/${KIND_ROOM[item.kind]}?open=${item.id}`}>
            <Icon name="external" /> ABRIR EN SU SALA
          </Link>
        )}
        <div>
          <span className="kicker">CONEXIONES · {related.length}</span>
          <ul className="steps" style={{ marginTop: 6 }}>
            {related.map(({ link, other }) => (
              <li key={link.id}>
                <span className="tag" style={{ color: KIND_COLOR[other!.kind] }}>{KIND_LABEL[other!.kind]}</span>
                <span className="grow">{other!.title}</span>
                <button className="icon-btn" onClick={() => store.deleteEdge(link.id)} aria-label="Quitar conexión">
                  <Icon name="x" />
                </button>
              </li>
            ))}
            {!related.length && <li className="dim">Arrastra desde su punto derecho hacia otro nodo.</li>}
          </ul>
        </div>
        {item.kind === 'idea' && (
          <button className="btn btn-sm btn-danger" onClick={async () => confirm('¿Borrar idea?') && (await store.deleteItem(item.id), onClose())}>
            <Icon name="trash" /> BORRAR IDEA
          </button>
        )}
      </div>
    </Win>
  );
}

export default function Page() {
  return (
    <RoomShell slug="mapa">
      <Suspense>
        <ReactFlowProvider>
          <MindMap />
        </ReactFlowProvider>
      </Suspense>
    </RoomShell>
  );
}
