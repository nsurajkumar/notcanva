import { create } from "zustand";

export type WinId = "editor" | "tools" | "properties" | "layers" | "files" | "templates" | "recycle" | "export" | "newdoc" | "about" | "welcome" | "help";

interface Win {
  open: boolean;
  min: boolean;
  max: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WinState {
  wins: Record<WinId, Win>;
  order: WinId[];
  open: (id: WinId) => void;
  close: (id: WinId) => void;
  toggle: (id: WinId) => void;
  minimize: (id: WinId) => void;
  toggleMax: (id: WinId) => void;
  focus: (id: WinId) => void;
  move: (id: WinId, x: number, y: number) => void;
  resize: (id: WinId, w: number, h: number) => void;
  top: () => WinId | undefined;
  layout: (vw: number, vh: number) => void;
}

const w = (x: number, y: number, ww: number, h: number, open = false, max = false): Win => ({ open, min: false, max, x, y, w: ww, h });

export const useWindows = create<WinState>((set, get) => ({
  wins: {
    editor: w(140, 10, 900, 600, true, true),
    tools: w(12, 60, 104, 470),
    properties: w(900, 60, 270, 470),
    layers: w(900, 540, 270, 260, false),
    files: w(180, 80, 640, 460),
    templates: w(220, 100, 620, 440),
    recycle: w(260, 120, 560, 380),
    export: w(360, 140, 360, 330),
    newdoc: w(360, 140, 380, 360),
    about: w(380, 160, 380, 300),
    welcome: w(320, 110, 460, 380),
    help: w(320, 80, 440, 560),
  },
  order: ["editor"],
  focus: (id) => set((s) => ({ order: [...s.order.filter((o) => o !== id), id] })),
  open: (id) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], open: true, min: false } }, order: [...s.order.filter((o) => o !== id), id] })),
  close: (id) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], open: false } }, order: s.order.filter((o) => o !== id) })),
  toggle: (id) => {
    const win = get().wins[id];
    if (win.open && !win.min) get().close(id);
    else get().open(id);
  },
  minimize: (id) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], min: true } } })),
  toggleMax: (id) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], max: !s.wins[id].max } } })),
  move: (id, x, y) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], x, y } } })),
  resize: (id, ww, h) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], w: ww, h } } })),
  top: () => get().order[get().order.length - 1],
  layout: (vw, vh) =>
    set((s) => {
      const wins = { ...s.wins };
      wins.properties = { ...wins.properties, x: Math.max(120, vw - 290), y: 50, h: Math.min(480, vh - 120) };
      wins.layers = { ...wins.layers, x: Math.max(120, vw - 290), y: Math.min(vh - 320, 540) };
      const center = (id: WinId) => {
        wins[id] = { ...wins[id], x: Math.max(0, (vw - wins[id].w) / 2), y: Math.max(10, (vh - wins[id].h) / 2 - 30) };
      };
      (["files", "templates", "recycle", "export", "newdoc", "about", "welcome", "help"] as WinId[]).forEach(center);
      return { wins };
    }),
}));
