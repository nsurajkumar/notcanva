import { create } from "zustand";
import type { Doc, El } from "./types";
import { newId } from "./factory";

export type Tool = "select" | "hand" | "text" | "rect" | "ellipse" | "triangle" | "line" | "arrow" | "sticky" | "card" | "pen" | "connector" | "frame" | "eraser" | "star";

interface EditorState {
  doc: Doc | null;
  selected: string[];
  tool: Tool;
  zoom: number;
  pan: { x: number; y: number };
  past: Doc[];
  future: Doc[];
  clipboard: El[];
  editingId: string | null;
  penColor: string;
  setDoc: (d: Doc | null) => void;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  select: (ids: string[]) => void;
  setEditing: (id: string | null) => void;
  setPenColor: (c: string) => void;
  commit: () => void; // push snapshot before a change
  addEl: (el: El) => void;
  updateEl: (id: string, patch: Partial<El>, record?: boolean) => void;
  updateMany: (patches: { id: string; patch: Partial<El> }[], record?: boolean) => void;
  fitNonce: number;
  requestFit: () => void;
  pendingConnector: string | null;
  setPendingConnector: (id: string | null) => void;
  removeSelected: () => void;
  removeIds: (ids: string[]) => void;
  setDocProps: (patch: Partial<Doc>) => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  reorder: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
}

const clone = (d: Doc): Doc => JSON.parse(JSON.stringify(d));
const touch = (d: Doc): Doc => ({ ...d, updatedAt: Date.now() });

export const useEditor = create<EditorState>((set, get) => ({
  doc: null, selected: [], tool: "select", zoom: 0.5, pan: { x: 40, y: 40 },
  past: [], future: [], clipboard: [], editingId: null, penColor: "#e8e8e8",
  setDoc: (d) => set({ doc: d, selected: [], past: [], future: [], editingId: null }),
  setTool: (t) => set({ tool: t, editingId: null, pendingConnector: null }),
  setZoom: (z) => set({ zoom: Math.min(8, Math.max(0.05, z)) }),
  setPan: (p) => set({ pan: p }),
  select: (ids) => set({ selected: ids }),
  setEditing: (id) => set({ editingId: id }),
  setPenColor: (c) => set({ penColor: c }),
  commit: () => {
    const d = get().doc;
    if (!d) return;
    set((s) => ({ past: [...s.past.slice(-99), clone(d)], future: [] }));
  },
  addEl: (el) => {
    const d = get().doc;
    if (!d) return;
    get().commit();
    set({ doc: touch({ ...d, elements: [...d.elements, el] }), selected: [el.id] });
  },
  updateEl: (id, patch, record = true) => {
    const d = get().doc;
    if (!d) return;
    if (record) get().commit();
    set({ doc: touch({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }) });
  },
  fitNonce: 0,
  requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
  pendingConnector: null,
  setPendingConnector: (id) => set({ pendingConnector: id }),
  updateMany: (patches, record = true) => {
    const d = get().doc;
    if (!d) return;
    if (record) get().commit();
    const m = new Map(patches.map((p) => [p.id, p.patch]));
    set({ doc: touch({ ...d, elements: d.elements.map((e) => (m.has(e.id) ? { ...e, ...m.get(e.id) } : e)) }) });
  },
  removeIds: (ids) => {
    const d = get().doc;
    if (!d || !ids.length) return;
    get().commit();
    const gone = new Set(ids);
    set({
      doc: touch({ ...d, elements: d.elements.filter((e) => !gone.has(e.id) && !(e.type === "connector" && (gone.has(e.from!) || gone.has(e.to!)))) }),
      selected: [],
    });
  },
  removeSelected: () => {
    const { doc, selected } = get();
    if (!doc) return;
    const ids = selected.filter((id) => !doc.elements.find((e) => e.id === id)?.locked);
    get().removeIds(ids);
  },
  setDocProps: (patch) => {
    const d = get().doc;
    if (!d) return;
    get().commit();
    set({ doc: touch({ ...d, ...patch }) });
  },
  undo: () => {
    const { past, doc } = get();
    if (!past.length || !doc) return;
    set({ doc: touch(past[past.length - 1]!), past: past.slice(0, -1), future: [clone(doc), ...get().future], selected: [] });
  },
  redo: () => {
    const { future, doc } = get();
    if (!future.length || !doc) return;
    set({ doc: touch(future[0]!), future: future.slice(1), past: [...get().past, clone(doc)], selected: [] });
  },
  copy: () => {
    const { doc, selected } = get();
    if (!doc) return;
    set({ clipboard: doc.elements.filter((e) => selected.includes(e.id)).map((e) => JSON.parse(JSON.stringify(e))) });
  },
  paste: () => {
    const { doc, clipboard } = get();
    if (!doc || !clipboard.length) return;
    get().commit();
    const idMap = new Map<string, string>();
    const copies = clipboard.map((e) => {
      const id = newId();
      idMap.set(e.id, id);
      return { ...e, id, x: e.x + 24, y: e.y + 24, locked: false };
    });
    copies.forEach((c) => {
      if (c.type === "connector") {
        c.from = idMap.get(c.from ?? "") ?? c.from;
        c.to = idMap.get(c.to ?? "") ?? c.to;
      }
    });
    set({ doc: touch({ ...doc, elements: [...doc.elements, ...copies] }), selected: copies.map((c) => c.id), clipboard: copies });
  },
  duplicate: () => {
    get().copy();
    get().paste();
  },
  reorder: (id, dir) => {
    const d = get().doc;
    if (!d) return;
    const arr = [...d.elements];
    const i = arr.findIndex((e) => e.id === id);
    if (i < 0) return;
    get().commit();
    const [el] = arr.splice(i, 1);
    const to = dir === "up" ? Math.min(arr.length, i + 1) : dir === "down" ? Math.max(0, i - 1) : dir === "top" ? arr.length : 0;
    arr.splice(to, 0, el!);
    set({ doc: touch({ ...d, elements: arr }) });
  },
}));
