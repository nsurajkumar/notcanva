import { useState } from "react";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, CaseUpper, Copy, Trash2, Lock, Unlock, FlipHorizontal2, FlipVertical2,
  ArrowUpToLine, ArrowDownToLine, Type, PaintBucket, Square, Minus, Plus, Sparkles, LayoutGrid,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { FONTS, SIZE_PRESETS, type El } from "@/lib/editor/types";
import { ColorPicker } from "./ColorPicker";
import { bringSelected, flip, toggleLock } from "@/lib/editor/actions";

function Btn({ on, title, onClick, children, disabled }: { on?: boolean; title: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button className={`nc-cb-btn ${on ? "is-on" : ""}`} title={title} aria-label={title} aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Stepper({ value, onChange, min = 1, title }: { value: number; onChange: (n: number) => void; min?: number; title: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="nc-stepper" title={title}>
      <button onClick={() => onChange(Math.max(min, Math.round(value) - 1))} aria-label={`Decrease ${title}`}><Minus size={12} /></button>
      <input
        value={draft ?? String(Math.round(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== null && !isNaN(Number(draft))) onChange(Math.max(min, Number(draft))); setDraft(null); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        aria-label={title}
      />
      <button onClick={() => onChange(Math.round(value) + 1)} aria-label={`Increase ${title}`}><Plus size={12} /></button>
    </span>
  );
}

export function ContextBar() {
  const { doc, selected, updateMany, setDocProps, duplicate, removeSelected, requestFit } = useEditor();
  const [showEffects, setShowEffects] = useState(false);
  if (!doc) return null;
  const els = doc.elements.filter((e) => selected.includes(e.id));
  const el = els[0];

  if (!el) {
    return (
      <div className="nc-contextbar">
        <span className="nc-cb-label">{doc.kind === "board" ? "Case Board" : "Page"}</span>
        <ColorPicker label="Background color" value={doc.background} onChange={(v) => setDocProps({ background: v })} allowNone={false} icon={<PaintBucket size={15} />} />
        {doc.kind === "design" && (
          <>
            <span className="nc-cb-sep" />
            <select
              className="nc-cb-select"
              value=""
              aria-label="Resize page"
              onChange={(e) => {
                const p = SIZE_PRESETS[Number(e.target.value)];
                if (p) { setDocProps({ width: p.w, height: p.h }); requestFit(); }
              }}
            >
              <option value="">Resize · {doc.width} × {doc.height}</option>
              {SIZE_PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
            </select>
          </>
        )}
        <span className="nc-cb-hint">Click anything to edit it · right-click for more · press ? for shortcuts</span>
      </div>
    );
  }

  const all = (patch: Partial<El>) => updateMany(els.filter((e) => !e.locked).map((e) => ({ id: e.id, patch })));
  const hasText = el.text !== undefined && el.type !== "frame";
  const hasFill = !["line", "arrow", "pen", "connector", "image"].includes(el.type);
  const bold = !!el.fontStyle?.includes("bold"), italic = !!el.fontStyle?.includes("italic");
  const style = (b: boolean, i: boolean) => [b && "bold", i && "italic"].filter(Boolean).join(" ") || "normal";
  const locked = els.every((e) => e.locked);

  return (
    <div className="nc-contextbar">
      {hasText && (
        <>
          <select className="nc-cb-select nc-cb-font" value={el.fontFamily} onChange={(e) => all({ fontFamily: e.target.value })} aria-label="Font" style={{ fontFamily: el.fontFamily }}>
            {FONTS.map((f) => <option key={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <Stepper title="Font size" value={el.fontSize ?? 18} onChange={(n) => all({ fontSize: n })} min={4} />
          <ColorPicker label="Text color" value={el.textColor ?? "#000000"} onChange={(v) => all({ textColor: v })} allowNone={false} icon={<Type size={15} />} />
          <Btn title="Bold (Ctrl+B)" on={bold} onClick={() => all({ fontStyle: style(!bold, italic) })}><Bold size={15} /></Btn>
          <Btn title="Italic (Ctrl+I)" on={italic} onClick={() => all({ fontStyle: style(bold, !italic) })}><Italic size={15} /></Btn>
          <Btn title="Underline (Ctrl+U)" on={!!el.underline} onClick={() => all({ underline: !el.underline })}><Underline size={15} /></Btn>
          <Btn title="Uppercase" on={!!el.uppercase} onClick={() => all({ uppercase: !el.uppercase })}><CaseUpper size={15} /></Btn>
          <Btn
            title={`Align ${el.align ?? "left"}`}
            onClick={() => all({ align: el.align === "left" || !el.align ? "center" : el.align === "center" ? "right" : "left" })}
          >
            {el.align === "center" ? <AlignCenter size={15} /> : el.align === "right" ? <AlignRight size={15} /> : <AlignLeft size={15} />}
          </Btn>
          <span className="nc-cb-sep" />
        </>
      )}
      {hasFill && <ColorPicker label="Fill color" value={el.fill} onChange={(v) => all({ fill: v })} icon={<PaintBucket size={15} />} />}
      {el.type !== "text" && (
        <ColorPicker label="Border color" value={el.stroke} onChange={(v) => all({ stroke: v, ...(el.type === "connector" ? { fill: v } : {}) })} icon={<Square size={15} />} />
      )}
      {el.type !== "text" && <Stepper title="Border width" value={el.strokeWidth} onChange={(n) => all({ strokeWidth: n })} min={0} />}
      <span className="nc-cb-sep" />
      <label className="nc-cb-range" title="Transparency">
        <span>Opacity</span>
        <input type="range" min={0} max={100} value={Math.round(el.opacity * 100)} onChange={(e) => updateMany(els.map((x) => ({ id: x.id, patch: { opacity: Number(e.target.value) / 100 } })), false)} onPointerDown={() => useEditor.getState().commit()} />
      </label>
      <div className="nc-cb-pop-wrap">
        <Btn title="Effects" on={showEffects} onClick={() => setShowEffects((v) => !v)}><Sparkles size={15} /></Btn>
        {showEffects && (
          <div className="nc-cpop nc-effects" onPointerLeave={() => setShowEffects(false)}>
            <div className="nc-cp-title">Effects</div>
            <label className="nc-radio"><input type="checkbox" checked={!!el.shadow} onChange={() => all({ shadow: !el.shadow })} /> Drop shadow</label>
            {["rect", "card", "image"].includes(el.type) && (
              <label className="nc-field"><span>Corners</span><input type="range" min={0} max={Math.min(el.width, el.height) / 2} value={el.cornerRadius ?? 0} onChange={(e) => all({ cornerRadius: Number(e.target.value) })} /></label>
            )}
            {hasText && (
              <>
                <label className="nc-field"><span>Letter spacing</span><input type="range" min={-5} max={40} value={el.letterSpacing ?? 0} onChange={(e) => all({ letterSpacing: Number(e.target.value) })} /></label>
                <label className="nc-field"><span>Line height</span><input type="range" min={0.8} max={2.5} step={0.05} value={el.lineHeight ?? 1.25} onChange={(e) => all({ lineHeight: Number(e.target.value) })} /></label>
              </>
            )}
          </div>
        )}
      </div>
      <span className="nc-cb-sep" />
      <Btn title="Flip horizontal" onClick={() => flip("x")}><FlipHorizontal2 size={15} /></Btn>
      <Btn title="Flip vertical" onClick={() => flip("y")}><FlipVertical2 size={15} /></Btn>
      <Btn title="Bring to front" onClick={() => bringSelected("top")}><ArrowUpToLine size={15} /></Btn>
      <Btn title="Send to back" onClick={() => bringSelected("bottom")}><ArrowDownToLine size={15} /></Btn>
      <span className="nc-spacer" />
      {els.length > 1 && <span className="nc-cb-label"><LayoutGrid size={13} /> {els.length} selected</span>}
      <Btn title={locked ? "Unlock (Ctrl+L)" : "Lock (Ctrl+L)"} on={locked} onClick={toggleLock}>{locked ? <Lock size={15} /> : <Unlock size={15} />}</Btn>
      <Btn title="Duplicate (Ctrl+D)" onClick={duplicate}><Copy size={15} /></Btn>
      <Btn title="Delete (Del)" onClick={removeSelected} disabled={locked}><Trash2 size={15} /></Btn>
    </div>
  );
}
