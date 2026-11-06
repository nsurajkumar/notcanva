import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Group, Rect, Ellipse, Line, Arrow, Text, Star, Image as KImage, Transformer } from "react-konva";
import { ContextMenu } from "./ContextMenu";
import { useEditor } from "@/lib/editor/store";
import type { El } from "@/lib/editor/types";
import { makeEl } from "@/lib/editor/factory";
import { assetUrl, db } from "@/lib/db";
import { registerStage } from "@/lib/export";
import { newId } from "@/lib/editor/factory";

function useAssetImage(id?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    if (!id) return;
    assetUrl(id).then((u) => {
      if (!u || !alive) return;
      const i = new window.Image();
      i.onload = () => alive && setImg(i);
      i.src = u;
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return img;
}

function ImageBody({ el }: { el: El }) {
  const img = useAssetImage(el.assetId);
  return img ? (
    <KImage image={img} width={el.width} height={el.height} cornerRadius={el.cornerRadius ?? 0} stroke={el.stroke} strokeWidth={el.strokeWidth} />
  ) : (
    <Rect width={el.width} height={el.height} fill="#cccccc" />
  );
}

function Body({ el, editing }: { el: El; editing: boolean }) {
  const w = el.width, h = el.height;
  const shadow = el.shadow ? { shadowColor: "#000", shadowBlur: 18, shadowOpacity: 0.35, shadowOffsetX: 4, shadowOffsetY: 8 } : {};
  const raw = el.text ?? "";
  const textProps = {
    text: editing ? "" : el.uppercase ? raw.toUpperCase() : raw,
    letterSpacing: el.letterSpacing ?? 0,
    textDecoration: el.underline ? "underline" : "",
    ...shadow,
    fontSize: el.fontSize ?? 18,
    fontFamily: `${el.fontFamily ?? "Tahoma"}, Tahoma, "Segoe UI", Arial, sans-serif`,
    fontStyle: el.fontStyle ?? "normal",
    align: el.align ?? "left",
    fill: el.textColor ?? "#000",
    lineHeight: el.lineHeight ?? 1.25,
  };
  switch (el.type) {
    case "rect":
      return <Rect width={w} height={h} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} cornerRadius={el.cornerRadius ?? 0} {...shadow} />;
    case "ellipse":
      return <Ellipse x={w / 2} y={h / 2} radiusX={Math.abs(w / 2)} radiusY={Math.abs(h / 2)} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} {...shadow} />;
    case "star":
      return <Star x={w / 2} y={h / 2} numPoints={5} innerRadius={Math.min(w, h) / 4.4} outerRadius={Math.min(w, h) / 2} scaleX={w >= h ? w / h : 1} scaleY={h > w ? h / w : 1} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} {...shadow} />;
    case "triangle":
      return <Line points={[w / 2, 0, w, h, 0, h]} closed fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} {...shadow} />;
    case "line":
      return <Line points={el.points ?? []} stroke={el.stroke} strokeWidth={el.strokeWidth} lineCap="round" hitStrokeWidth={20} />;
    case "arrow":
      return <Arrow points={el.points ?? []} stroke={el.stroke} fill={el.stroke} strokeWidth={el.strokeWidth} pointerLength={el.strokeWidth * 4} pointerWidth={el.strokeWidth * 4} hitStrokeWidth={20} />;
    case "pen":
      return <Line points={el.points ?? []} stroke={el.stroke} strokeWidth={el.strokeWidth} tension={0.4} lineCap="round" lineJoin="round" hitStrokeWidth={14} />;
    case "text":
      return (
        <>
          <Rect width={w} height={Math.max(h, (el.fontSize ?? 18) * 1.3)} fill={el.fill === "transparent" ? "rgba(0,0,0,0)" : el.fill} />
          <Text width={w} {...textProps} />
        </>
      );
    case "sticky":
      return (
        <>
          <Rect width={w} height={h} fill={el.fill} shadowColor="#000" shadowBlur={12} shadowOpacity={0.35} shadowOffsetY={4} />
          <Text x={14} y={14} width={w - 28} height={h - 28} {...textProps} />
        </>
      );
    case "card":
      return (
        <>
          <Rect width={w} height={h} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} cornerRadius={el.cornerRadius ?? 6} shadowColor="#000" shadowBlur={10} shadowOpacity={0.3} />
          <Text x={14} y={14} width={w - 28} height={h - 28} {...textProps} />
        </>
      );
    case "frame":
      return (
        <>
          <Text y={-(el.fontSize ?? 16) - 8} text={editing ? "" : el.text ?? "Frame"} fontSize={el.fontSize ?? 16} fill={el.textColor ?? "#aaa"} fontFamily="Tahoma" />
          <Rect width={w} height={h} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 1} dash={[8, 6]} cornerRadius={4} />
        </>
      );
    case "image":
      return <ImageBody el={el} />;
    default:
      return null;
  }
}

function edgePoint(a: El, tx: number, ty: number) {
  const cx = a.x + a.width / 2, cy = a.y + a.height / 2;
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const s = Math.min(a.width / 2 / Math.abs(dx || 1e-9), a.height / 2 / Math.abs(dy || 1e-9));
  return [cx + dx * s, cy + dy * s];
}

function connectorPoints(a: El, b: El) {
  const acx = a.x + a.width / 2, acy = a.y + a.height / 2, bcx = b.x + b.width / 2, bcy = b.y + b.height / 2;
  const [x1, y1] = edgePoint(a, bcx, bcy) as [number, number];
  const [x2, y2] = edgePoint(b, acx, acy) as [number, number];
  const horiz = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (horiz ? [x1, y1, mx, y1, mx, y2, x2, y2] : [x1, y1, x1, my, x2, my, x2, y2]) as number[];
}

const TEXTY = new Set(["text", "sticky", "card", "frame"]);
const DRAW_TOOLS = new Set(["rect", "ellipse", "triangle", "star", "line", "arrow", "frame"]);

export function CanvasStage() {
  const wrap = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [space, setSpace] = useState(false);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const action = useRef<
    | { kind: "pan"; sx: number; sy: number; px: number; py: number }
    | { kind: "draw"; id: string; ox: number; oy: number; type: string }
    | { kind: "marquee"; ox: number; oy: number; add: boolean }
    | { kind: "erase" }
    | null
  >(null);
  const dragStart = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [hover, setHover] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const s = useEditor();
  const { doc, zoom, pan, tool, selected, editingId } = s;

  useEffect(() => {
    const redraw = () =>
      stageRef.current?.find("Text").forEach((n) => {
        const t = n as Konva.Text;
        const f = t.fontFamily();
        t.fontFamily(`${f} `);
        t.fontFamily(f);
      });
    const fonts = document.fonts;
    ["Bebas Neue", "Space Mono"].forEach((f) => fonts.load(`20px "${f}"`).catch(() => {}));
    fonts.ready.then(() => { redraw(); stageRef.current?.batchDraw(); });
    fonts.addEventListener("loadingdone", () => { redraw(); stageRef.current?.batchDraw(); });
    registerStage(stageRef.current);
    return () => registerStage(null);
  }, []);

  useEffect(() => {
    const onPaste = (ev: ClipboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const file = [...(ev.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) { ev.preventDefault(); void addImageFile(file); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Fit view
  const fit = () => {
    const st = useEditor.getState();
    const d = st.doc;
    if (!d || !wrap.current) return;
    const W = wrap.current.clientWidth, H = wrap.current.clientHeight;
    let b = { x: 0, y: 0, w: d.width, h: d.height };
    if (d.kind === "board") {
      const els = d.elements.filter((e) => e.type !== "connector");
      if (!els.length) {
        st.setZoom(1);
        st.setPan({ x: W / 2, y: H / 2 });
        return;
      }
      const x1 = Math.min(...els.map((e) => e.x)), y1 = Math.min(...els.map((e) => e.y));
      const x2 = Math.max(...els.map((e) => e.x + e.width)), y2 = Math.max(...els.map((e) => e.y + e.height));
      b = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    const z = Math.min((W - 80) / b.w, (H - 120) / b.h, 2);
    st.setZoom(z);
    st.setPan({ x: (W - b.w * z) / 2 - b.x * z, y: (H - b.h * z) / 2 - b.y * z });
  };
  useEffect(() => {
    const t = setTimeout(fit, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, s.fitNonce]);

  // Space-to-pan
  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isField(e.target)) {
        setSpace(true);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpace(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Transformer nodes
  useEffect(() => {
    const tr = trRef.current, st = stageRef.current;
    if (!tr || !st || !doc) return;
    const nodes = selected
      .map((id) => doc.elements.find((e) => e.id === id))
      .filter((e): e is El => !!e && e.type !== "connector" && !e.locked && e.visible && editingId !== e.id)
      .map((e) => st.findOne((n: Konva.Node) => n.id() === e.id))
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selected, doc, editingId]);

  const byId = useMemo(() => new Map((doc?.elements ?? []).map((e) => [e.id, e])), [doc]);

  if (!doc) return <div ref={wrap} className="nc-canvas-wrap" />;

  const isBoard = doc.kind === "board";
  const pos = () => stageRef.current!.getRelativePointerPosition()!;
  const elIdFrom = (t: Konva.Node): string | null => {
    const g = t.findAncestor(".el", true) as Konva.Node | undefined;
    return g ? g.id() : null;
  };

  const onDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const st = useEditor.getState();
    const evt = e.evt as MouseEvent;
    const p = pos();
    const target = e.target;
    if (target.getParent()?.className === "Transformer") return;
    const elId = elIdFrom(target);
    if (evt.button === 1 || st.tool === "hand" || space) {
      action.current = { kind: "pan", sx: evt.clientX ?? 0, sy: evt.clientY ?? 0, px: st.pan.x, py: st.pan.y };
      return;
    }
    if (st.editingId) st.setEditing(null);
    switch (st.tool) {
      case "select": {
        if (elId) {
          if (evt.shiftKey) st.select(st.selected.includes(elId) ? st.selected.filter((i) => i !== elId) : [...st.selected, elId]);
          else if (!st.selected.includes(elId)) st.select([elId]);
        } else {
          if (!evt.shiftKey) st.select([]);
          action.current = { kind: "marquee", ox: p.x, oy: p.y, add: evt.shiftKey };
          setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
        }
        return;
      }
      case "connector": {
        if (!elId || byId.get(elId)?.type === "connector") return st.setPendingConnector(null);
        if (!st.pendingConnector) return st.setPendingConnector(elId);
        if (st.pendingConnector !== elId) {
          const c = makeEl("connector", 0, 0, { from: st.pendingConnector, to: elId, stroke: isBoard ? "#9a9aa6" : "#333333", fill: isBoard ? "#9a9aa6" : "#333333" });
          st.addEl(c);
          st.select([]);
        }
        st.setPendingConnector(null);
        return;
      }
      case "eraser": {
        if (elId) st.removeIds([elId]);
        action.current = { kind: "erase" };
        return;
      }
      case "pen": {
        const el = makeEl("pen", p.x, p.y, { points: [0, 0], stroke: st.penColor, strokeWidth: Math.max(2, 3 / Math.max(st.zoom, 0.3)) });
        st.addEl(el);
        st.select([]);
        action.current = { kind: "draw", id: el.id, ox: p.x, oy: p.y, type: "pen" };
        return;
      }
      case "text":
      case "sticky":
      case "card": {
        const over: Partial<El> = st.tool === "text" ? { textColor: isBoard ? "#f2f2f2" : "#1a1a1a" } : {};
        const el = makeEl(st.tool, p.x, p.y, over);
        st.addEl(el);
        st.setTool("select");
        st.select([el.id]);
        st.setEditing(el.id);
        return;
      }
      default:
        if (DRAW_TOOLS.has(st.tool)) {
          const isLine = st.tool === "line" || st.tool === "arrow";
          const lineColor = isBoard ? "#d8d8de" : "#222222";
          const el = makeEl(st.tool as El["type"], p.x, p.y, isLine ? { points: [0, 0, 0, 0], width: 0, height: 0, stroke: lineColor } : { width: 1, height: 1 });
          st.addEl(el);
          action.current = { kind: "draw", id: el.id, ox: p.x, oy: p.y, type: st.tool };
        }
    }
  };

  const onMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const a = action.current;
    if (!a) return;
    const st = useEditor.getState();
    const evt = e.evt as MouseEvent;
    if (a.kind === "pan") {
      st.setPan({ x: a.px + ((evt.clientX ?? 0) - a.sx), y: a.py + ((evt.clientY ?? 0) - a.sy) });
      return;
    }
    const p = pos();
    if (a.kind === "marquee") {
      setMarquee({ x: Math.min(a.ox, p.x), y: Math.min(a.oy, p.y), w: Math.abs(p.x - a.ox), h: Math.abs(p.y - a.oy) });
    } else if (a.kind === "erase") {
      const hit = stageRef.current!.getIntersection(stageRef.current!.getPointerPosition()!);
      const id = hit ? elIdFrom(hit) : null;
      if (id && byId.get(id)?.type === "pen") st.removeIds([id]);
    } else if (a.kind === "draw") {
      const dx = p.x - a.ox, dy = p.y - a.oy;
      if (a.type === "pen") {
        const el = st.doc!.elements.find((x) => x.id === a.id);
        if (!el) return;
        const pts = [...(el.points ?? []), dx, dy];
        const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
        st.updateEl(a.id, { points: pts, width: Math.max(...xs), height: Math.max(...ys) }, false);
      } else if (a.type === "line" || a.type === "arrow") {
        st.updateEl(a.id, { points: [0, 0, dx, dy], width: dx, height: dy }, false);
      } else {
        st.updateEl(a.id, { x: Math.min(a.ox, p.x), y: Math.min(a.oy, p.y), width: Math.max(1, Math.abs(dx)), height: Math.max(1, Math.abs(dy)) }, false);
      }
    }
  };

  const onUp = () => {
    const a = action.current;
    action.current = null;
    const st = useEditor.getState();
    if (!a) return;
    if (a.kind === "marquee") {
      const m = marquee;
      setMarquee(null);
      if (m && (m.w > 3 || m.h > 3)) {
        const hits = st.doc!.elements.filter((el) => {
          if (!el.visible || el.locked || el.type === "connector") return false;
          const pts = el.points?.length ? el.points : [0, 0, el.width, el.height];
          const xs = pts.filter((_, i) => i % 2 === 0).map((v) => v + el.x), ys = pts.filter((_, i) => i % 2 === 1).map((v) => v + el.y);
          return Math.min(...xs) < m.x + m.w && Math.max(...xs) > m.x && Math.min(...ys) < m.y + m.h && Math.max(...ys) > m.y;
        });
        st.select([...new Set([...(a.add ? st.selected : []), ...hits.map((h) => h.id)])]);
      }
    } else if (a.kind === "draw" && a.type !== "pen") {
      const el = st.doc!.elements.find((x) => x.id === a.id);
      if (el) {
        if ((a.type === "line" || a.type === "arrow") && Math.hypot(el.width, el.height) < 5) st.updateEl(el.id, { points: [0, 0, 200, 0], width: 200, height: 0 }, false);
        else if (a.type !== "line" && a.type !== "arrow" && el.width < 6 && el.height < 6)
          st.updateEl(el.id, a.type === "frame" ? { width: 600, height: 400 } : { width: 200, height: 140 }, false);
      }
      st.setTool("select");
      st.select([a.id]);
    }
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const st = useEditor.getState();
    const stage = stageRef.current!;
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const pointer = stage.getPointerPosition()!;
      const old = st.zoom;
      const next = Math.min(8, Math.max(0.05, old * Math.pow(1.0015, -e.evt.deltaY * 2)));
      const wx = (pointer.x - st.pan.x) / old, wy = (pointer.y - st.pan.y) / old;
      st.setZoom(next);
      st.setPan({ x: pointer.x - wx * next, y: pointer.y - wy * next });
    } else {
      st.setPan({ x: st.pan.x - (e.evt.shiftKey ? e.evt.deltaY : e.evt.deltaX), y: st.pan.y - (e.evt.shiftKey ? 0 : e.evt.deltaY) });
    }
  };

  const onDragStart = (el: El, e: Konva.KonvaEventObject<DragEvent>) => {
    const st = useEditor.getState();
    if (!st.selected.includes(el.id)) st.select([el.id]);
    st.commit();
    const ids = useEditor.getState().selected;
    dragStart.current = new Map(st.doc!.elements.filter((x) => ids.includes(x.id)).map((x) => [x.id, { x: x.x, y: x.y }]));
    void e;
  };
  const onDragMove = (el: El, e: Konva.KonvaEventObject<DragEvent>) => {
    const st = useEditor.getState();
    const start = dragStart.current.get(el.id);
    if (!start) return;
    let dx = e.target.x() - start.x, dy = e.target.y() - start.y;
    // Smart guides: snap selection bbox edges/centers to page and other objects.
    const moving = st.doc!.elements.filter((x) => dragStart.current.has(x.id));
    if (moving.length && !(e.evt as MouseEvent).altKey) {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      moving.forEach((m) => {
        const p0 = dragStart.current.get(m.id)!;
        x1 = Math.min(x1, p0.x); y1 = Math.min(y1, p0.y);
        x2 = Math.max(x2, p0.x + Math.max(m.width, 0)); y2 = Math.max(y2, p0.y + Math.max(m.height, 0));
      });
      const vs: number[] = [], hs: number[] = [];
      if (st.doc!.kind === "design") { vs.push(0, st.doc!.width / 2, st.doc!.width); hs.push(0, st.doc!.height / 2, st.doc!.height); }
      st.doc!.elements.forEach((o) => {
        if (dragStart.current.has(o.id) || !o.visible || o.type === "connector" || o.type === "pen") return;
        vs.push(o.x, o.x + o.width / 2, o.x + o.width);
        hs.push(o.y, o.y + o.height / 2, o.y + o.height);
      });
      const th = 6 / st.zoom;
      const snap = (cands: number[], lines: number[]) => {
        let best: { d: number; line: number } | null = null;
        for (const c of cands) for (const l of lines) {
          const d = l - c;
          if (Math.abs(d) < th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, line: l };
        }
        return best;
      };
      const w = x2 - x1, h = y2 - y1;
      const sv = snap([x1 + dx, x1 + dx + w / 2, x1 + dx + w], vs);
      const sh = snap([y1 + dy, y1 + dy + h / 2, y1 + dy + h], hs);
      if (sv) dx += sv.d;
      if (sh) dy += sh.d;
      setGuides({ v: sv ? [sv.line] : [], h: sh ? [sh.line] : [] });
      e.target.position({ x: start.x + dx, y: start.y + dy });
    }
    st.updateMany(
      [...dragStart.current.entries()].map(([id, p0]) => ({ id, patch: { x: p0.x + dx, y: p0.y + dy } })),
      false,
    );
  };

  const onTransformEnd = () => {
    const st = useEditor.getState();
    const nodes = trRef.current?.nodes() ?? [];
    const patches = nodes.map((n) => {
      const el = st.doc!.elements.find((x) => x.id === n.id())!;
      const sx = Math.abs(n.scaleX()), sy = Math.abs(n.scaleY());
      n.scale({ x: el.flipX ? -1 : 1, y: el.flipY ? -1 : 1 });
      const patch: Partial<El> = { x: n.x(), y: n.y(), rotation: n.rotation() };
      if (el.points && (el.type === "pen" || el.type === "line" || el.type === "arrow")) {
        patch.points = el.points.map((v, i) => (i % 2 === 0 ? v * sx : v * sy));
        patch.width = el.width * sx;
        patch.height = el.height * sy;
      } else {
        patch.width = Math.max(5, el.width * sx);
        patch.height = Math.max(5, el.height * sy);
        if (el.type === "text" && Math.abs(sy - 1) > 0.01 && Math.abs(sx - 1) < 0.01) patch.fontSize = Math.max(6, Math.round((el.fontSize ?? 18) * sy));
      }
      return { id: el.id, patch };
    });
    st.updateMany(patches);
  };

  const onDbl = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const id = elIdFrom(e.target);
    const st = useEditor.getState();
    if (id && TEXTY.has(byId.get(id)?.type ?? "") && !byId.get(id)?.locked) {
      st.select([id]);
      st.setEditing(id);
    } else if (!id && isBoard && st.tool === "select") {
      const p = pos();
      const el = makeEl("sticky", p.x - 90, p.y - 80);
      st.addEl(el);
      st.setEditing(el.id);
    }
  };

  const onDrop = async (ev: React.DragEvent) => {
    ev.preventDefault();
    const file = [...ev.dataTransfer.files].find((f) => f.type.startsWith("image/"));
    if (!file || !stageRef.current) return;
    stageRef.current.setPointersPositions(ev.nativeEvent);
    const p = pos();
    await addImageFile(file, p.x, p.y);
  };

  const editingEl = editingId ? byId.get(editingId) : undefined;
  const cursor = space || tool === "hand" ? "grab" : tool === "select" ? "default" : tool === "eraser" ? "not-allowed" : "crosshair";
  const dot = 24 * zoom;

  return (
    <div
      ref={wrap}
      className={`nc-canvas-wrap ${isBoard ? "is-board" : ""}`}
      style={{
        cursor,
        backgroundColor: isBoard ? doc.background : undefined,
        backgroundSize: isBoard ? `${dot}px ${dot}px` : undefined,
        backgroundPosition: isBoard ? `${pan.x}px ${pan.y}px` : undefined,
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onMouseDown={onDown}
        onTouchStart={onDown}
        onMouseMove={onMove}
        onTouchMove={onMove}
        onMouseUp={onUp}
        onTouchEnd={onUp}
        onMouseLeave={onUp}
        onWheel={onWheel}
        onDblClick={onDbl}
        onDblTap={onDbl}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          const st = useEditor.getState();
          const id = elIdFrom(e.target);
          if (id && !st.selected.includes(id)) st.select([id]);
          const r = wrap.current!.getBoundingClientRect();
          setMenu({ x: e.evt.clientX - r.left, y: e.evt.clientY - r.top });
        }}
      >
        <Layer name="content">
          {!isBoard && (
            <Rect name="page ui-page" x={0} y={0} width={doc.width} height={doc.height} fill={doc.background} shadowColor="#000" shadowBlur={20} shadowOpacity={0.35} />
          )}
          {doc.elements.map((el) => {
            if (el.type === "connector") {
              const a = byId.get(el.from!), b = byId.get(el.to!);
              if (!a || !b || !a.visible || !b.visible) return null;
              const sel = selected.includes(el.id);
              return (
                <Group key={el.id} id={el.id} name="el" opacity={el.opacity} visible={el.visible}>
                  <Arrow points={connectorPoints(a, b)} bezier stroke={sel ? "#4fa3ff" : el.stroke} fill={sel ? "#4fa3ff" : el.stroke} strokeWidth={el.strokeWidth} pointerLength={8} pointerWidth={8} hitStrokeWidth={14} />
                </Group>
              );
            }
            return (
              <Group
                key={el.id}
                id={el.id}
                name="el"
                x={el.x}
                y={el.y}
                rotation={el.rotation}
                opacity={el.opacity}
                visible={el.visible}
                draggable={tool === "select" && !el.locked && !space && editingId !== el.id}
                onDragStart={(e) => onDragStart(el, e)}
                onDragMove={(e) => onDragMove(el, e)}
                onDragEnd={() => setGuides({ v: [], h: [] })}
                onMouseEnter={() => setHover(el.id)}
                onMouseLeave={() => setHover((h) => (h === el.id ? null : h))}
                scaleX={el.flipX ? -1 : 1}
                scaleY={el.flipY ? -1 : 1}
                offsetX={el.flipX ? el.width : 0}
                offsetY={el.flipY ? el.height : 0}
                onTransformEnd={onTransformEnd}
              >
                <Body el={el} editing={editingId === el.id} />
                {s.pendingConnector === el.id && <Rect name="ui" x={-4} y={-4} width={el.width + 8} height={el.height + 8} stroke="#4fa3ff" strokeWidth={2 / zoom} dash={[6, 4]} listening={false} />}
              </Group>
            );
          })}
          {hover && !selected.includes(hover) && tool === "select" && (() => {
            const h = byId.get(hover);
            if (!h || h.type === "connector" || h.points) return null;
            return <Rect name="ui" x={h.x} y={h.y} width={h.width} height={h.height} rotation={h.rotation} stroke="#4fa3ff" strokeWidth={1.5 / zoom} listening={false} />;
          })()}
          {guides.v.map((x) => <Line key={`v${x}`} name="ui" points={[x, -1e5, x, 1e5]} stroke="#ff3d9a" strokeWidth={1 / zoom} dash={[4 / zoom, 4 / zoom]} listening={false} />)}
          {guides.h.map((y) => <Line key={`h${y}`} name="ui" points={[-1e5, y, 1e5, y]} stroke="#ff3d9a" strokeWidth={1 / zoom} dash={[4 / zoom, 4 / zoom]} listening={false} />)}
          {marquee && <Rect name="ui" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(79,163,255,0.12)" stroke="#4fa3ff" strokeWidth={1 / zoom} listening={false} />}
          <Transformer
            name="ui"
            ref={trRef}
            keepRatio={false}
            rotateEnabled
            borderStroke="#4fa3ff"
            anchorStroke="#4fa3ff"
            anchorSize={9}
            boundBoxFunc={(o, n) => (Math.abs(n.width) < 5 || Math.abs(n.height) < 5 ? o : n)}
          />
        </Layer>
      </Stage>
      {editingEl && <TextEditor el={editingEl} />}
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
      {s.pendingConnector && <div className="nc-hint">Now click the element to connect to (Esc to cancel)</div>}
    </div>
  );
}

function TextEditor({ el }: { el: El }) {
  const { zoom, pan, updateEl, setEditing } = useEditor();
  const [val, setVal] = useState(el.text ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const pad = el.type === "sticky" || el.type === "card" ? 14 : 0;
  const isFrame = el.type === "frame";
  const fs = (el.fontSize ?? 18) * zoom;
  const done = () => {
    const patch: Partial<El> = { text: val };
    if (el.type === "text") patch.height = Math.max(el.height, (val.split("\n").length) * (el.fontSize ?? 18) * 1.3);
    updateEl(el.id, patch);
    setEditing(null);
  };
  return (
    <textarea
      ref={ref}
      className="nc-text-editor"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) (e.target as HTMLTextAreaElement).blur();
      }}
      style={{
        left: pan.x + (el.x + pad) * zoom,
        top: pan.y + (isFrame ? el.y - (el.fontSize ?? 16) - 8 : el.y + pad) * zoom,
        width: Math.max(80, (el.width - pad * 2) * zoom),
        height: isFrame ? fs * 1.5 : Math.max(fs * 1.4, (el.type === "text" ? Math.max(el.height, (val.split("\n").length) * (el.fontSize ?? 18) * 1.3) : el.height - pad * 2) * zoom),
        fontSize: fs,
        fontFamily: el.fontFamily,
        fontWeight: el.fontStyle?.includes("bold") ? 700 : 400,
        fontStyle: el.fontStyle?.includes("italic") ? "italic" : "normal",
        textAlign: (el.align as "left") ?? "left",
        color: el.textColor,
        lineHeight: 1.25,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "top left",
      }}
    />
  );
}

export async function addImageFile(file: File, x?: number, y?: number) {
  const st = useEditor.getState();
  if (!st.doc) return;
  const id = newId();
  await db().assets.put({ id, blob: file, type: file.type, createdAt: Date.now() });
  const url = await assetUrl(id);
  const img = new window.Image();
  await new Promise<void>((res) => {
    img.onload = () => res();
    img.onerror = () => res();
    img.src = url!;
  });
  const maxW = st.doc.kind === "board" ? 500 : st.doc.width * 0.6;
  const ratio = img.naturalWidth ? Math.min(1, maxW / img.naturalWidth) : 1;
  const w = (img.naturalWidth || 300) * ratio, h = (img.naturalHeight || 200) * ratio;
  const px = x ?? (st.doc.kind === "board" ? (-st.pan.x + 300) / st.zoom : (st.doc.width - w) / 2);
  const py = y ?? (st.doc.kind === "board" ? (-st.pan.y + 200) / st.zoom : (st.doc.height - h) / 2);
  st.addEl(makeEl("image", px, py, { width: w, height: h, assetId: id, fill: "transparent", strokeWidth: 0, name: file.name.slice(0, 30) || "Image" }));
}
