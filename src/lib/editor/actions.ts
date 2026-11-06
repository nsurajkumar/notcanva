import { useEditor } from "./store";
import type { El } from "./types";

const STYLE_KEYS: (keyof El)[] = ["fill", "stroke", "strokeWidth", "opacity", "cornerRadius", "fontSize", "fontFamily", "fontStyle", "align", "textColor", "letterSpacing", "lineHeight", "underline", "uppercase", "shadow"];
let styleClip: Partial<El> | null = null;

function sel() {
  const st = useEditor.getState();
  return st.doc ? st.doc.elements.filter((e) => st.selected.includes(e.id) && !e.locked && e.type !== "connector") : [];
}

export type AlignDir = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

/** Align selection. With one item (design) aligns to the page; with several, to the selection box. */
export function align(dir: AlignDir) {
  const st = useEditor.getState();
  const els = sel();
  if (!els.length || !st.doc) return;
  let x1: number, y1: number, x2: number, y2: number;
  if (els.length === 1 && st.doc.kind === "design") {
    x1 = 0; y1 = 0; x2 = st.doc.width; y2 = st.doc.height;
  } else {
    x1 = Math.min(...els.map((e) => e.x)); y1 = Math.min(...els.map((e) => e.y));
    x2 = Math.max(...els.map((e) => e.x + e.width)); y2 = Math.max(...els.map((e) => e.y + e.height));
  }
  st.updateMany(
    els.map((e) => {
      const p: Partial<El> = {};
      if (dir === "left") p.x = x1;
      if (dir === "right") p.x = x2 - e.width;
      if (dir === "hcenter") p.x = (x1 + x2) / 2 - e.width / 2;
      if (dir === "top") p.y = y1;
      if (dir === "bottom") p.y = y2 - e.height;
      if (dir === "vcenter") p.y = (y1 + y2) / 2 - e.height / 2;
      return { id: e.id, patch: p };
    }),
  );
}

export function distribute(axis: "h" | "v") {
  const st = useEditor.getState();
  const els = sel();
  if (els.length < 3) return;
  const k = axis === "h" ? "x" : "y", size = axis === "h" ? "width" : "height";
  const sorted = [...els].sort((a, b) => a[k] - b[k]);
  const first = sorted[0]!, last = sorted[sorted.length - 1]!;
  const total = sorted.reduce((s, e) => s + e[size], 0);
  const gap = (last[k] + last[size] - first[k] - total) / (sorted.length - 1);
  let cur = first[k];
  st.updateMany(
    sorted.map((e) => {
      const patch = { [k]: cur } as Partial<El>;
      cur += e[size] + gap;
      return { id: e.id, patch };
    }),
  );
}

export function flip(axis: "x" | "y") {
  const st = useEditor.getState();
  st.updateMany(sel().map((e) => ({ id: e.id, patch: axis === "x" ? { flipX: !e.flipX } : { flipY: !e.flipY } })));
}

export function copyStyle() {
  const e = sel()[0];
  if (!e) return false;
  styleClip = Object.fromEntries(STYLE_KEYS.filter((k) => e[k] !== undefined).map((k) => [k, e[k]])) as Partial<El>;
  return true;
}

export function pasteStyle() {
  if (!styleClip) return;
  const st = useEditor.getState();
  const clip = styleClip;
  st.updateMany(
    sel().map((e) => {
      const p: Partial<El> = { ...clip };
      if (e.text === undefined) STYLE_KEYS.slice(5).forEach((k) => delete p[k]);
      return { id: e.id, patch: p };
    }),
  );
}

export function hasStyleClip() {
  return !!styleClip;
}

export function toggleLock() {
  const st = useEditor.getState();
  if (!st.doc) return;
  const els = st.doc.elements.filter((e) => st.selected.includes(e.id));
  const lock = els.some((e) => !e.locked);
  st.updateMany(els.map((e) => ({ id: e.id, patch: { locked: lock } })));
}

export function bringSelected(dir: "up" | "down" | "top" | "bottom") {
  const st = useEditor.getState();
  st.selected.forEach((id) => useEditor.getState().reorder(id, dir));
}

export function selectAll() {
  const st = useEditor.getState();
  if (st.doc) st.select(st.doc.elements.filter((x) => !x.locked && x.visible).map((x) => x.id));
}

/** Zoom around the centre of the visible canvas. */
export function zoomTo(z: number) {
  const st = useEditor.getState();
  const wrap = document.querySelector(".nc-canvas-wrap") as HTMLElement | null;
  const W = wrap?.clientWidth ?? 800, H = wrap?.clientHeight ?? 600;
  const next = Math.min(8, Math.max(0.05, z));
  const wx = (W / 2 - st.pan.x) / st.zoom, wy = (H / 2 - st.pan.y) / st.zoom;
  st.setZoom(next);
  st.setPan({ x: W / 2 - wx * next, y: H / 2 - wy * next });
}

/** Insert an element at the current view centre. */
export function insertAtCenter(el: El) {
  const st = useEditor.getState();
  const d = st.doc;
  if (!d) return;
  const wrap = document.querySelector(".nc-canvas-wrap") as HTMLElement | null;
  const W = wrap?.clientWidth ?? 800, H = wrap?.clientHeight ?? 600;
  const cx = (W / 2 - st.pan.x) / st.zoom, cy = (H / 2 - st.pan.y) / st.zoom;
  // Scale presets to the page so a heading on an A4 poster is as readable as on a 1080px post.
  const k = d.kind === "design" ? Math.max(0.5, Math.min(d.width, d.height) / 1080) : 1;
  const s = (v: number | undefined) => (v === undefined ? undefined : v * k);
  const scaled: El = {
    ...el,
    width: el.width * k, height: el.height * k,
    fontSize: s(el.fontSize), strokeWidth: el.type === "text" ? el.strokeWidth : el.strokeWidth * k,
    cornerRadius: s(el.cornerRadius), letterSpacing: s(el.letterSpacing),
    points: el.points?.map((v) => v * k),
  };
  const w = Math.max(scaled.width, 1), h = Math.max(scaled.height, 1);
  st.addEl({ ...scaled, x: cx - w / 2, y: cy - h / 2 });
  st.setTool("select");
}
