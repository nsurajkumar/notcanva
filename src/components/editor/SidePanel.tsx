import { useEffect, useRef, useState } from "react";
import { LayoutTemplate, Shapes, Type, Upload, PenLine, Layers, Move, ChevronLeft, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Eraser, Spline } from "lucide-react";
import { liveQuery } from "dexie";
import { useEditor } from "@/lib/editor/store";
import { makeEl } from "@/lib/editor/factory";
import type { El } from "@/lib/editor/types";
import { db, assetUrl } from "@/lib/db";
import { TEMPLATES } from "@/lib/templates";
import { align, distribute, insertAtCenter } from "@/lib/editor/actions";
import { addImageFile } from "./CanvasStage";
import { LayersPanel } from "./Layers";
import { PropertiesPanel } from "./Properties";
import { saveDoc } from "@/lib/db";
import { openDoc } from "./FilePanels";

type Tab = "design" | "elements" | "text" | "uploads" | "draw" | "layers" | "position";
const TABS: { id: Tab; label: string; Icon: typeof Type }[] = [
  { id: "design", label: "Design", Icon: LayoutTemplate },
  { id: "elements", label: "Elements", Icon: Shapes },
  { id: "text", label: "Text", Icon: Type },
  { id: "uploads", label: "Uploads", Icon: Upload },
  { id: "draw", label: "Draw", Icon: PenLine },
  { id: "layers", label: "Layers", Icon: Layers },
  { id: "position", label: "Position", Icon: Move },
];

const isBoard = () => useEditor.getState().doc?.kind === "board";
const add = (type: El["type"], over: Partial<El> = {}) => insertAtCenter(makeEl(type, 0, 0, over));

function ElementsTab() {
  const shapes: { label: string; svg: React.ReactNode; make: () => void }[] = [
    { label: "Square", svg: <rect x="6" y="6" width="36" height="36" />, make: () => add("rect", { width: 240, height: 240 }) },
    { label: "Rounded", svg: <rect x="6" y="6" width="36" height="36" rx="9" />, make: () => add("rect", { width: 240, height: 240, cornerRadius: 40 }) },
    { label: "Circle", svg: <circle cx="24" cy="24" r="18" />, make: () => add("ellipse", { width: 240, height: 240 }) },
    { label: "Triangle", svg: <path d="M24 6L42 42H6z" />, make: () => add("triangle", { width: 240, height: 220 }) },
    { label: "Star", svg: <path d="M24 5l5.6 12 13 1.4-9.8 8.8 2.8 12.8L24 33.4 12.4 40l2.8-12.8L5.4 18.4l13-1.4z" />, make: () => add("star", { width: 240, height: 240 }) },
    { label: "Pill", svg: <rect x="4" y="15" width="40" height="18" rx="9" />, make: () => add("rect", { width: 320, height: 110, cornerRadius: 55 }) },
  ];
  const lines: { label: string; svg: React.ReactNode; make: () => void }[] = [
    { label: "Line", svg: <path d="M6 24h36" strokeWidth="4" stroke="currentColor" />, make: () => add("line", { points: [0, 0, 300, 0], width: 300, height: 0, stroke: isBoard() ? "#d8d8de" : "#222222" }) },
    { label: "Arrow", svg: <path d="M6 24h30M30 16l8 8-8 8" strokeWidth="4" stroke="currentColor" fill="none" />, make: () => add("arrow", { points: [0, 0, 300, 0], width: 300, height: 0, stroke: isBoard() ? "#d8d8de" : "#222222" }) },
  ];
  const notes = ["#f7d154", "#f5a3c7", "#9be7c4", "#a5c8ff", "#ffb877"];
  return (
    <>
      <h4>Shapes</h4>
      <div className="nc-shape-grid">
        {shapes.map((s) => (
          <button key={s.label} className="nc-shape" title={s.label} onClick={s.make}>
            <svg viewBox="0 0 48 48" width="44" height="44" fill="currentColor">{s.svg}</svg>
          </button>
        ))}
        {lines.map((s) => (
          <button key={s.label} className="nc-shape" title={s.label} onClick={s.make}>
            <svg viewBox="0 0 48 48" width="44" height="44">{s.svg}</svg>
          </button>
        ))}
      </div>
      <h4>Sticky notes</h4>
      <div className="nc-shape-grid">
        {notes.map((c) => (
          <button key={c} className="nc-shape" title="Sticky note" onClick={() => add("sticky", { fill: c })}>
            <span className="nc-note-chip" style={{ background: c }} />
          </button>
        ))}
      </div>
      <h4>Board pieces</h4>
      <div className="nc-chip-list">
        <button onClick={() => add("card")}>Dark card</button>
        <button onClick={() => add("card", { fill: "#c79a12", stroke: "#e6b420", textColor: "#1b1400", text: "MAIN IDEA", fontStyle: "bold", fontSize: 20 })}>Gold card</button>
        <button onClick={() => add("card", { fill: "#0f4c47", stroke: "#1b7a71", text: "Note\n• detail" })}>Teal card</button>
        <button onClick={() => add("frame")}>Frame</button>
        <button onClick={() => useEditor.getState().setTool("connector")}><Spline size={13} /> Connect two items</button>
      </div>
    </>
  );
}

function TextTab() {
  const light = () => (isBoard() ? "#f2f2f2" : "#1a1a1a");
  const presets: { label: string; cls: string; over: () => Partial<El> }[] = [
    { label: "Add a heading", cls: "h", over: () => ({ text: "Add a heading", fontSize: 72, fontStyle: "bold", width: 640, height: 94 }) },
    { label: "Add a subheading", cls: "s", over: () => ({ text: "Add a subheading", fontSize: 40, fontStyle: "bold", width: 480, height: 52 }) },
    { label: "Add a little bit of body text", cls: "b", over: () => ({ text: "Add a little bit of body text", fontSize: 22, fontStyle: "normal", width: 420, height: 30 }) },
  ];
  const combos: { label: string; over: Partial<El> }[] = [
    { label: "BIG POSTER", over: { text: "BIG POSTER", fontFamily: "Bebas Neue", fontStyle: "normal", fontSize: 120, width: 640, height: 130, letterSpacing: 4 } },
    { label: "case_file.txt", over: { text: "case_file.txt", fontFamily: "Space Mono", fontStyle: "normal", fontSize: 28, width: 360, height: 36 } },
    { label: "Elegant serif", over: { text: "Elegant serif", fontFamily: "Georgia", fontStyle: "italic", fontSize: 56, width: 520, height: 70 } },
    { label: "SPACED LABEL", over: { text: "SPACED LABEL", fontStyle: "bold", fontSize: 20, letterSpacing: 8, width: 420, height: 28 } },
  ];
  return (
    <>
      <button className="nc-wide-btn" onClick={() => add("text", { textColor: light() })}>T &nbsp;Add a text box</button>
      <h4>Default text styles</h4>
      {presets.map((p) => (
        <button key={p.label} className={`nc-text-preset nc-tp-${p.cls}`} onClick={() => add("text", { ...p.over(), textColor: light() })}>{p.label}</button>
      ))}
      <h4>Font combinations</h4>
      <div className="nc-combo-grid">
        {combos.map((c) => (
          <button key={c.label} className="nc-combo" style={{ fontFamily: c.over.fontFamily, fontStyle: c.over.fontStyle?.includes("italic") ? "italic" : "normal", letterSpacing: (c.over.letterSpacing ?? 0) / 4 }} onClick={() => add("text", { ...c.over, textColor: light() })}>
            {c.label}
          </button>
        ))}
      </div>
    </>
  );
}

function UploadsTab() {
  const [assets, setAssets] = useState<{ id: string; url: string }[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const sub = liveQuery(() => db().assets.toArray()).subscribe(async (all) => {
      const list = await Promise.all(all.sort((a, b) => b.createdAt - a.createdAt).map(async (a) => ({ id: a.id, url: (await assetUrl(a.id)) ?? "" })));
      setAssets(list);
    });
    return () => sub.unsubscribe();
  }, []);
  const reuse = async (id: string, url: string) => {
    const img = new window.Image();
    await new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); img.src = url; });
    const st = useEditor.getState();
    const maxW = st.doc?.kind === "board" ? 500 : (st.doc?.width ?? 1000) * 0.6;
    const k = img.naturalWidth ? Math.min(1, maxW / img.naturalWidth) : 1;
    add("image", { assetId: id, width: (img.naturalWidth || 300) * k, height: (img.naturalHeight || 200) * k, fill: "transparent", strokeWidth: 0 });
  };
  return (
    <>
      <button className="nc-wide-btn" onClick={() => ref.current?.click()}>Upload images</button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={async (e) => { for (const f of [...(e.target.files ?? [])]) await addImageFile(f); e.target.value = ""; }} />
      <p className="nc-muted">Images stay on this device. You can also drag files onto the canvas or paste with Ctrl+V.</p>
      <div className="nc-upload-grid">
        {assets.map((a) => (
          <button key={a.id} className="nc-upload" onClick={() => reuse(a.id, a.url)} title="Add to design"><img src={a.url} alt="" /></button>
        ))}
      </div>
      {!assets.length && <p className="nc-muted">No uploads yet.</p>}
    </>
  );
}

function DrawTab() {
  const { tool, setTool, penColor, setPenColor } = useEditor();
  const colors = ["#111111", "#e8e8e8", "#ff3131", "#ff914d", "#ffde59", "#00bf63", "#38b6ff", "#8c52ff", "#ff66c4"];
  return (
    <>
      <div className="nc-chip-list">
        <button className={tool === "pen" ? "is-on" : ""} onClick={() => setTool("pen")}><PenLine size={14} /> Pen</button>
        <button className={tool === "eraser" ? "is-on" : ""} onClick={() => setTool("eraser")}><Eraser size={14} /> Eraser</button>
      </div>
      <h4>Color</h4>
      <div className="nc-cgrid">
        {colors.map((c) => (
          <button key={c} className={`nc-cswatch ${penColor === c ? "is-on" : ""}`} style={{ background: c }} aria-label={c} onClick={() => { setPenColor(c); setTool("pen"); }} />
        ))}
      </div>
      <p className="nc-muted">Draw freely on the canvas. The eraser removes whole strokes.</p>
    </>
  );
}

function PositionTab() {
  const n = useEditor((s) => s.selected.length);
  const A = [
    { d: "left", I: AlignStartVertical, t: "Left" }, { d: "hcenter", I: AlignCenterVertical, t: "Centre" }, { d: "right", I: AlignEndVertical, t: "Right" },
    { d: "top", I: AlignStartHorizontal, t: "Top" }, { d: "vcenter", I: AlignCenterHorizontal, t: "Middle" }, { d: "bottom", I: AlignEndHorizontal, t: "Bottom" },
  ] as const;
  return (
    <>
      <h4>Align {n === 1 ? "to page" : "elements"}</h4>
      <div className="nc-align-grid">
        {A.map(({ d, I, t }) => (
          <button key={d} disabled={!n} onClick={() => align(d)}><I size={15} /> {t}</button>
        ))}
        <button disabled={n < 3} onClick={() => distribute("h")}><AlignHorizontalSpaceAround size={15} /> Space H</button>
        <button disabled={n < 3} onClick={() => distribute("v")}><AlignVerticalSpaceAround size={15} /> Space V</button>
      </div>
      <h4>Details</h4>
      <PropertiesPanel />
    </>
  );
}

function DesignTab() {
  return (
    <>
      <h4>Templates</h4>
      <div className="nc-tpl-list">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="nc-tpl" onClick={async () => { const d = t.build(); await saveDoc(d); await openDoc(d); }}>
            <b>{t.name}</b>
            <span className="nc-muted">{t.hint}</span>
          </button>
        ))}
      </div>
      <p className="nc-muted">Templates open as a new copy in your Case Files.</p>
    </>
  );
}

export function SidePanel() {
  const [tab, setTab] = useState<Tab | null>("elements");
  const selected = useEditor((s) => s.selected.length);
  const content: Record<Tab, React.ReactNode> = {
    design: <DesignTab />, elements: <ElementsTab />, text: <TextTab />, uploads: <UploadsTab />, draw: <DrawTab />, layers: <LayersPanel />, position: <PositionTab />,
  };
  return (
    <>
      <nav className="nc-rail" aria-label="Editor panels">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`nc-rail-btn ${tab === id ? "is-on" : ""}`} onClick={() => setTab(tab === id ? null : id)} aria-pressed={tab === id}>
            <Icon size={20} />
            <span>{label}</span>
            {id === "position" && selected > 0 && <i className="nc-dot" />}
          </button>
        ))}
      </nav>
      {tab && (
        <aside className="nc-side">
          <div className="nc-side-head">
            <b>{TABS.find((t) => t.id === tab)!.label}</b>
            <button className="nc-ico" aria-label="Close panel" onClick={() => setTab(null)}><ChevronLeft size={16} /></button>
          </div>
          <div className="nc-side-body">{content[tab]}</div>
        </aside>
      )}
    </>
  );
}
