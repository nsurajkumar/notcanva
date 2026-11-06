import { useEffect, useRef, useState } from "react";

import "./xp.css";
import { useWindows, type WinId } from "./windows";
import { XpWindow } from "./XpWindow";
import { IconBin, IconBoard, IconDesign, IconFolder, IconInfo, IconLogo, IconTemplates } from "./icons";
import { CanvasStage } from "../editor/CanvasStage";
import { BoardDock, TOOL_LIST } from "../editor/Tools";
import { SidePanel } from "../editor/SidePanel";
import { ContextBar } from "../editor/ContextBar";
import { ShortcutsHelp } from "../editor/ShortcutsHelp";
import { bringSelected, copyStyle, flip, pasteStyle, selectAll, toggleLock, zoomTo } from "@/lib/editor/actions";
import { newId } from "@/lib/editor/factory";
import { Download, Keyboard, Maximize, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import { CaseFilesPanel, ExportPanel, NewDocPanel, RecycleBinPanel, TemplatesPanel, WelcomePanel, openDoc } from "../editor/FilePanels";
import { Mascot, showMascotAgain } from "../editor/Mascot";
import { useEditor } from "@/lib/editor/store";
import { db, saveDoc } from "@/lib/db";
import { thumbnail } from "@/lib/export";
import { TEMPLATES } from "@/lib/templates";
import { backupDoc } from "@/lib/backup";

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    f();
    const i = setInterval(f, 15000);
    return () => clearInterval(i);
  }, []);
  return <span className="xp-clock">{t}</span>;
}

const WIN_LABEL: Record<WinId, string> = {
  editor: "Editor", tools: "Tools", properties: "Properties", layers: "Layers", help: "Shortcuts", files: "Case Files", templates: "Templates",
  recycle: "Recycle Bin", export: "Export", newdoc: "New design", about: "About notcanva", welcome: "Read me first",
};

function useAutosave() {
  const [status, setStatus] = useState<"saved" | "saving" | "idle">("idle");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = 0;
    const unsub = useEditor.subscribe((s, prev) => {
      if (!s.doc || s.doc === prev.doc || s.doc.updatedAt === last) return;
      if (prev.doc?.id !== s.doc.id) return; // just opened
      setStatus("saving");
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const d = useEditor.getState().doc;
        if (!d) return;
        last = d.updatedAt;
        const editing = useEditor.getState().editingId;
        await saveDoc({ ...d, thumbnail: editing ? d.thumbnail : thumbnail(d) ?? d.thumbnail });
        setStatus("saved");
      }, 1000);
    });
    const flush = () => {
      const d = useEditor.getState().doc;
      if (d) void saveDoc(d);
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      unsub();
      clearTimeout(timer);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);
  return status;
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const st = useEditor.getState();
      if (!st.doc) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod) {
        if (k === "z" && !e.shiftKey) st.undo();
        else if (k === "y" || (k === "z" && e.shiftKey)) st.redo();
        else if (k === "c" && e.altKey) copyStyle();
        else if (k === "v" && e.altKey) pasteStyle();
        else if (k === "c") st.copy();
        else if (k === "v") st.paste();
        else if (k === "]") bringSelected(e.shiftKey ? "top" : "up");
        else if (k === "[") bringSelected(e.shiftKey ? "bottom" : "down");
        else if (k === "l") toggleLock();
        else if (k === "1") zoomTo(1);
        else if (k === "b" || k === "i" || k === "u") {
          const els = st.doc.elements.filter((x) => st.selected.includes(x.id) && x.text !== undefined);
          if (!els.length) return;
          st.updateMany(els.map((x) => {
            if (k === "u") return { id: x.id, patch: { underline: !x.underline } };
            const b = !!x.fontStyle?.includes("bold"), it = !!x.fontStyle?.includes("italic");
            const nb = k === "b" ? !b : b, ni = k === "i" ? !it : it;
            return { id: x.id, patch: { fontStyle: [nb && "bold", ni && "italic"].filter(Boolean).join(" ") || "normal" } };
          }));
        }
        else if (k === "x") { st.copy(); st.removeSelected(); }
        else if (k === "d") st.duplicate();
        else if (k === "a") st.select(st.doc.elements.filter((x) => !x.locked && x.visible).map((x) => x.id));
        else if (k === "0") st.requestFit();
        else if (k === "=" || k === "+") zoomTo(st.zoom * 1.25);
        else if (k === "-") zoomTo(st.zoom / 1.25);
        else if (k === "s") void saveDoc(st.doc);
        else return;
        e.preventDefault();
        return;
      }
      if (k === "delete" || k === "backspace") { st.removeSelected(); e.preventDefault(); return; }
      if (k === "escape") { st.select([]); st.setTool("select"); return; }
      if (e.key.startsWith("Arrow") && st.selected.length) {
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        st.updateMany(st.doc.elements.filter((x) => st.selected.includes(x.id) && !x.locked).map((x) => ({ id: x.id, patch: { x: x.x + dx, y: x.y + dy } })));
        e.preventDefault();
        return;
      }
      if (e.key === "?") { useWindows.getState().open("help"); return; }
      if (e.shiftKey && (k === "h" || k === "v")) { flip(k === "h" ? "x" : "y"); return; }
      const tool = TOOL_LIST.find((x) => x.key.toLowerCase() === k);
      if (tool && !e.altKey) st.setTool(tool.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function EditorBody({ status }: { status: string }) {
  const { doc, zoom, undo, redo, past, future, requestFit } = useEditor();
  const open = useWindows((s) => s.open);
  const [menu, setMenu] = useState<string | null>(null);
  if (!doc) {
    return (
      <div className="nc-empty">
        <IconFolder size={64} />
        <p>No case is open.</p>
        <div className="nc-row">
          <button onClick={() => open("files")}>Open Case Files</button>
          <button onClick={() => open("templates")}>Start from a template</button>
        </div>
      </div>
    );
  }
  const item = (label: string, fn: () => void, hint?: string) => (
    <button className="nc-menu-item" onClick={() => { setMenu(null); fn(); }}>
      <span>{label}</span>
      {hint && <span className="nc-muted">{hint}</span>}
    </button>
  );
  const st = () => useEditor.getState();
  const menus: Record<string, React.ReactNode> = {
    File: (
      <>
        {item("New design…", () => open("newdoc"))}
        {item("New Case Board", newBoard)}
        {item("Make a copy", async () => { const d = { ...JSON.parse(JSON.stringify(doc)), id: newId(), title: `${doc.title} (copy)`, createdAt: Date.now(), updatedAt: Date.now() }; await saveDoc(d); await openDoc(d); })}
        <div className="nc-menu-sep" />
        {item("Case Files…", () => open("files"))}
        {item("Templates…", () => open("templates"))}
        <div className="nc-menu-sep" />
        {item("Download / Export…", () => open("export"))}
        {item("Backup .notcanva", () => backupDoc(doc))}
      </>
    ),
    Edit: (
      <>
        {item("Undo", undo, "Ctrl+Z")}
        {item("Redo", redo, "Ctrl+Y")}
        <div className="nc-menu-sep" />
        {item("Cut", () => { st().copy(); st().removeSelected(); }, "Ctrl+X")}
        {item("Copy", () => st().copy(), "Ctrl+C")}
        {item("Paste", () => st().paste(), "Ctrl+V")}
        {item("Duplicate", () => st().duplicate(), "Ctrl+D")}
        {item("Delete", () => st().removeSelected(), "Del")}
        <div className="nc-menu-sep" />
        {item("Copy style", () => copyStyle(), "Ctrl+Alt+C")}
        {item("Paste style", pasteStyle, "Ctrl+Alt+V")}
        {item("Select all", selectAll, "Ctrl+A")}
      </>
    ),
    View: (
      <>
        {item("Zoom to fit", requestFit, "Ctrl+0")}
        {item("Actual size (100%)", () => zoomTo(1), "Ctrl+1")}
        {item("Zoom in", () => zoomTo(zoom * 1.25), "Ctrl++")}
        {item("Zoom out", () => zoomTo(zoom / 1.25), "Ctrl+-")}
        <div className="nc-menu-sep" />
        {item("Keyboard shortcuts", () => open("help"), "?")}
      </>
    ),
  };
  return (
    <div className="nc-editor">
      <div className="nc-menubar">
        {Object.keys(menus).map((m) => (
          <div key={m} className="nc-menu">
            <button className={`nc-menu-btn ${menu === m ? "is-on" : ""}`} onClick={() => setMenu(menu === m ? null : m)} onMouseEnter={() => menu && setMenu(m)}>{m}</button>
            {menu === m && <div className="nc-menu-pop" onMouseLeave={() => setMenu(null)}>{menus[m]}</div>}
          </div>
        ))}
        <span className="nc-doc-title">{doc.kind === "board" ? <IconBoard size={16} /> : <IconDesign size={16} />}
          <input
            className="nc-title-input"
            value={doc.title}
            aria-label="Design name"
            onChange={(e) => useEditor.setState({ doc: { ...doc, title: e.target.value, updatedAt: Date.now() } })}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </span>
        <span className="nc-spacer" />
        <span className="nc-save-pill">{status === "saving" ? "Saving…" : "✓ Saved in this browser"}</span>
        <button className="nc-mini" onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
        <button className="nc-mini" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)"><Redo2 size={14} /></button>
        <button className="nc-mini nc-primary" onClick={() => open("export")}><Download size={13} /> Download</button>
      </div>
      <div className="nc-main">
        <SidePanel />
        <div className="nc-work">
          <ContextBar />
          <div className="nc-canvas-area">
            <CanvasStage />
            {doc.kind === "board" && <BoardDock />}
          </div>
          <div className="nc-bottombar">
            <span>{doc.kind === "board" ? "Case Board · endless canvas" : `${doc.width} × ${doc.height}px`}</span>
            <span>{doc.elements.length} objects</span>
            <span className="nc-spacer" />
            <button className="nc-bb-btn" onClick={() => open("help")} title="Keyboard shortcuts (?)"><Keyboard size={14} /></button>
            <button className="nc-bb-btn" onClick={() => zoomTo(zoom / 1.25)} aria-label="Zoom out"><Minus size={13} /></button>
            <input className="nc-zoom-range" type="range" min={5} max={400} value={Math.round(zoom * 100)} onChange={(e) => zoomTo(Number(e.target.value) / 100)} aria-label="Zoom" />
            <button className="nc-bb-btn" onClick={() => zoomTo(zoom * 1.25)} aria-label="Zoom in"><Plus size={13} /></button>
            <button className="nc-bb-btn nc-bb-pct" onClick={requestFit} title="Zoom to fit (Ctrl+0)">{Math.round(zoom * 100)}%</button>
            <button className="nc-bb-btn" onClick={requestFit} title="Fit to screen"><Maximize size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function newBoard() {
  const d = TEMPLATES[0]!.build();
  d.elements = [];
  d.title = "Untitled board";
  await saveDoc(d);
  await openDoc(d);
}

export default function Desktop() {
  const wins = useWindows((s) => s.wins);
  const { open, focus, minimize, layout } = useWindows.getState();
  const order = useWindows((s) => s.order);
  const [startOpen, setStartOpen] = useState(false);
  const [mascotKey, setMascotKey] = useState(0);
  const [ready, setReady] = useState(false);
  const status = useAutosave();
  useShortcuts();
  const booted = useRef(false);
  const docTitle = useEditor((s) => s.doc?.title);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const vw = window.innerWidth, vh = window.innerHeight;
    layout(vw, vh);
    (async () => {
      const all = (await db().designs.toArray()).filter((d) => !d.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
      if (all[0]) useEditor.getState().setDoc(all[0]);
      else {
        const d = TEMPLATES[0]!.build();
        await saveDoc(d);
        useEditor.getState().setDoc(d);
      }
      if (localStorage.getItem("nc-welcome-seen") !== "1") open("welcome");
      setReady(true);
    })();
  }, [layout, open]);

  const icons: { id: WinId; label: string; icon: React.ReactNode }[] = [
    { id: "files", label: "Case Files", icon: <IconFolder /> },
    { id: "templates", label: "Templates", icon: <IconTemplates /> },
    { id: "recycle", label: "Recycle Bin", icon: <IconBin /> },
    { id: "about", label: "About", icon: <IconInfo /> },
  ];
  const taskWins = (Object.keys(wins) as WinId[]).filter((id) => wins[id].open);
  const active = order[order.length - 1];

  return (
    <div className="xp-desktop" onPointerDown={() => startOpen && setStartOpen(false)}>
      <div className="xp-wallpaper" aria-hidden />
      <div className="xp-icons">
        {icons.map((i) => (
          <button key={i.id} className="xp-icon" onDoubleClick={() => open(i.id)} onClick={(e) => e.detail === 1 && window.innerWidth < 768 && open(i.id)}>
            {i.icon}
            <span>{i.label}</span>
          </button>
        ))}
      </div>

      {ready && (
        <>
          <XpWindow id="editor" title={`notcanva · ${docTitle ?? "Editor"}`} icon={<IconLogo size={14} />} bodyClass="p0">
            <EditorBody status={status} />
          </XpWindow>
          <XpWindow id="help" title="Keyboard shortcuts"><ShortcutsHelp /></XpWindow>
          <XpWindow id="files" title="Case Files" icon={<IconFolder size={14} />}><CaseFilesPanel /></XpWindow>
          <XpWindow id="templates" title="Templates" icon={<IconTemplates size={14} />}><TemplatesPanel /></XpWindow>
          <XpWindow id="recycle" title="Recycle Bin" icon={<IconBin size={14} />}><RecycleBinPanel /></XpWindow>
          <XpWindow id="export" title="Export"><ExportPanel /></XpWindow>
          <XpWindow id="newdoc" title="New design"><NewDocPanel /></XpWindow>
          <XpWindow id="welcome" title="Read me first" icon={<IconInfo size={14} />}>
            <WelcomePanel onDone={() => { localStorage.setItem("nc-welcome-seen", "1"); useWindows.getState().close("welcome"); }} />
          </XpWindow>
          <XpWindow id="about" title="About notcanva" icon={<IconInfo size={14} />}>
            <div className="nc-props">
              <p><b>notcanva</b> is a free, open-source design editor that runs entirely in your browser. No signup, no uploads, no tracking.</p>
              <p>MIT licensed. Made with zero bucks.</p>
              <p className="nc-muted">notcanva is an independent open-source project. Not affiliated with, endorsed by, or connected to Canva.</p>
              <a href="/">← Back to the homepage</a>
            </div>
          </XpWindow>
        </>
      )}

      <Mascot key={mascotKey} />

      {startOpen && (
        <div className="xp-start-menu" onPointerDown={(e) => e.stopPropagation()}>
          <div className="xp-start-head"><IconLogo size={22} /> Detective</div>
          <div className="xp-start-items">
            {([
              ["New design…", () => open("newdoc")],
              ["New Case Board", newBoard],
              ["Case Files", () => open("files")],
              ["Templates", () => open("templates")],
              ["Export", () => open("export")],
              ["Keyboard shortcuts", () => open("help")],
              ["Recycle Bin", () => open("recycle")],
              ["Show Detective Pixel", () => { showMascotAgain(); setMascotKey((k) => k + 1); }],
              ["Storage notice", () => open("welcome")],
              ["About notcanva", () => open("about")],
            ] as [string, () => void][]).map(([label, fn]) => (
              <button key={label} onClick={() => { setStartOpen(false); fn(); }}>{label}</button>
            ))}
          </div>
          <div className="xp-start-foot">
            <a href="/">Log off (back to homepage)</a>
          </div>
        </div>
      )}

      <div className="xp-taskbar">
        <button className="xp-startbtn" onPointerDown={(e) => e.stopPropagation()} onClick={() => setStartOpen((o) => !o)}>
          <IconLogo size={16} /> notcanva
        </button>
        <div className="xp-tasks">
          {taskWins.map((id) => (
            <button
              key={id}
              className={`xp-task ${active === id && !wins[id].min ? "is-on" : ""}`}
              onClick={() => (wins[id].min ? open(id) : active === id ? minimize(id) : focus(id))}
            >
              {WIN_LABEL[id]}
            </button>
          ))}
        </div>
        <div className="xp-tray">
          <span title={status === "saving" ? "Saving…" : "Saved in this browser"}>{status === "saving" ? "💾" : "✔"}</span>
          <Clock />
        </div>
      </div>
    </div>
  );
}
