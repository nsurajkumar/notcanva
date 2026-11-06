import { useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";
import { db, gcAssets, requestPersist, saveDoc } from "@/lib/db";
import { useEditor } from "@/lib/editor/store";
import { makeDoc } from "@/lib/editor/factory";
import { SIZE_PRESETS, type Doc } from "@/lib/editor/types";
import { TEMPLATES } from "@/lib/templates";
import { backupDoc, restoreFile } from "@/lib/backup";
import { exportDoc } from "@/lib/export";
import { useWindows } from "../desktop/windows";
import { IconBoard, IconDesign } from "../desktop/icons";

function useDocs(deleted: boolean) {
  const [docs, setDocs] = useState<Doc[]>([]);
  useEffect(() => {
    const sub = liveQuery(() => db().designs.toArray()).subscribe((all) =>
      setDocs(all.filter((d) => (deleted ? !!d.deletedAt : !d.deletedAt)).sort((a, b) => b.updatedAt - a.updatedAt)),
    );
    return () => sub.unsubscribe();
  }, [deleted]);
  return docs;
}

export async function openDoc(d: Doc) {
  const cur = useEditor.getState().doc;
  if (cur) await saveDoc(cur);
  useEditor.getState().setDoc(d);
  useEditor.getState().setTool("select");
  useWindows.getState().focus("editor");
}

async function createAndOpen(d: Doc) {
  await saveDoc(d);
  await openDoc(d);
}

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

export function CaseFilesPanel() {
  const docs = useDocs(false);
  const current = useEditor((s) => s.doc?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  return (
    <div className="nc-files">
      <div className="nc-toolbar">
        <button onClick={() => useWindows.getState().open("newdoc")}>New design…</button>
        <button onClick={() => createAndOpen(makeDoc("board", "Untitled board"))}>New Case Board</button>
        <button onClick={() => fileRef.current?.click()}>Restore .notcanva…</button>
        <input
          ref={fileRef}
          type="file"
          accept=".notcanva,application/zip"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const d = await restoreFile(f);
              await openDoc(d);
              setMsg(`Restored “${d.title}”.`);
            } catch (err) {
              setMsg(`Could not restore: ${(err as Error).message}`);
            }
          }}
        />
      </div>
      {msg && <p className="nc-note">{msg}</p>}
      {!docs.length && <p className="nc-muted">No case files yet.</p>}
      <div className="nc-file-grid">
        {docs.map((d) => (
          <div key={d.id} className={`nc-file ${d.id === current ? "is-current" : ""}`}>
            <button className="nc-thumb" onDoubleClick={() => openDoc(d)} onClick={() => openDoc(d)} title="Open">
              {d.thumbnail ? <img src={d.thumbnail} alt="" /> : d.kind === "board" ? <IconBoard size={48} /> : <IconDesign size={48} />}
            </button>
            <input
              className="nc-file-title"
              defaultValue={d.title}
              aria-label="Rename"
              onBlur={async (e) => {
                const title = e.target.value.trim() || d.title;
                await db().designs.update(d.id, { title });
                const st = useEditor.getState();
                if (st.doc?.id === d.id) useEditor.setState({ doc: { ...st.doc, title } });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <span className="nc-muted">{d.kind === "board" ? "Board" : `${d.width}×${d.height}`} · {ago(d.updatedAt)}</span>
            <span className="nc-row">
              <button className="nc-mini" onClick={() => backupDoc(d)}>Backup</button>
              <button
                className="nc-mini"
                onClick={async () => {
                  await db().designs.update(d.id, { deletedAt: Date.now() });
                  if (useEditor.getState().doc?.id === d.id) useEditor.getState().setDoc(null);
                }}
              >
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecycleBinPanel() {
  const docs = useDocs(true);
  return (
    <div className="nc-files">
      <div className="nc-toolbar">
        <button
          disabled={!docs.length}
          onClick={async () => {
            if (!confirm("Permanently delete everything in the Recycle Bin?")) return;
            await db().designs.bulkDelete(docs.map((d) => d.id));
            await gcAssets();
          }}
        >
          Empty Recycle Bin
        </button>
      </div>
      {!docs.length && <p className="nc-muted">The Recycle Bin is empty.</p>}
      <ul className="nc-list">
        {docs.map((d) => (
          <li key={d.id}>
            <span>{d.title}</span>
            <span className="nc-muted">deleted {ago(d.deletedAt!)}</span>
            <button className="nc-mini" onClick={() => db().designs.update(d.id, { deletedAt: null })}>Restore</button>
            <button
              className="nc-mini"
              onClick={async () => {
                await db().designs.delete(d.id);
                await gcAssets();
              }}
            >
              Delete forever
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TemplatesPanel() {
  return (
    <div className="nc-file-grid">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          className="nc-template"
          onClick={async () => {
            await createAndOpen(t.build());
            useWindows.getState().close("templates");
          }}
        >
          {t.id === "board" ? <IconBoard size={44} /> : <IconDesign size={44} />}
          <b>{t.name}</b>
          <span className="nc-muted">{t.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function NewDocPanel() {
  const [preset, setPreset] = useState(0);
  const [w, setW] = useState(SIZE_PRESETS[0]!.w);
  const [h, setH] = useState(SIZE_PRESETS[0]!.h);
  const [title, setTitle] = useState("Untitled design");
  return (
    <div className="nc-props">
      <label className="nc-field">
        <span>Name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <fieldset>
        <legend>Size</legend>
        {SIZE_PRESETS.map((p, i) => (
          <label key={p.label} className="nc-radio">
            <input type="radio" checked={preset === i} onChange={() => { setPreset(i); setW(p.w); setH(p.h); }} /> {p.label}
          </label>
        ))}
        <label className="nc-radio">
          <input type="radio" checked={preset === -1} onChange={() => setPreset(-1)} /> Custom
        </label>
        {preset === -1 && (
          <div className="nc-grid2">
            <label className="nc-field"><span>W</span><input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} /></label>
            <label className="nc-field"><span>H</span><input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} /></label>
          </div>
        )}
      </fieldset>
      <div className="nc-row">
        <button
          className="nc-primary"
          onClick={async () => {
            await createAndOpen(makeDoc("design", title || "Untitled design", Math.max(50, w), Math.max(50, h)));
            useWindows.getState().close("newdoc");
          }}
        >
          Create
        </button>
        <button onClick={() => useWindows.getState().close("newdoc")}>Cancel</button>
      </div>
    </div>
  );
}

export function ExportPanel() {
  const doc = useEditor((s) => s.doc);
  const [format, setFormat] = useState<"png" | "jpg" | "pdf">("png");
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!doc) return <p className="nc-muted">Open a case first.</p>;
  return (
    <div className="nc-props">
      <fieldset>
        <legend>Format</legend>
        {(["png", "jpg", "pdf"] as const).map((f) => (
          <label key={f} className="nc-radio">
            <input type="radio" checked={format === f} onChange={() => setFormat(f)} /> {f.toUpperCase()}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Scale</legend>
        {[1, 2, 3].map((s) => (
          <label key={s} className="nc-radio">
            <input type="radio" checked={scale === s} onChange={() => setScale(s)} /> {s}x
          </label>
        ))}
      </fieldset>
      {format === "jpg" && (
        <label className="nc-field">
          <span>Quality {quality}%</span>
          <input type="range" min={30} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
        </label>
      )}
      {err && <p className="nc-note">{err}</p>}
      <div className="nc-row">
        <button
          className="nc-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr("");
            useEditor.getState().select([]);
            await new Promise((r) => setTimeout(r, 60));
            try {
              await exportDoc(useEditor.getState().doc!, format, scale, quality / 100);
            } catch (e) {
              setErr(`Export failed: ${(e as Error).message}. Try a smaller scale.`);
            }
            setBusy(false);
          }}
        >
          {busy ? "Exporting…" : "Download"}
        </button>
        <button onClick={() => backupDoc(doc)}>Backup .notcanva</button>
      </div>
    </div>
  );
}

export function WelcomePanel({ onDone }: { onDone: () => void }) {
  return (
    <div className="nc-props">
      <p><b>Welcome, detective.</b> Before you start, one important thing:</p>
      <p className="nc-warning">
        Your designs are saved <b>only in this browser</b> on this device. Nothing is uploaded. If you clear your browsing data, or the browser runs low on space, your designs can be deleted.
      </p>
      <p>Use <b>Backup .notcanva</b> in Case Files or Export to keep a safe copy on your computer.</p>
      <div className="nc-row">
        <button
          className="nc-primary"
          onClick={async () => {
            await requestPersist();
            onDone();
          }}
        >
          Got it, keep my work safe
        </button>
      </div>
    </div>
  );
}
