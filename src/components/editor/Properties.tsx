import { useEditor } from "@/lib/editor/store";
import { FONTS, SIZE_PRESETS, type El } from "@/lib/editor/types";

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="nc-field">
      <span>{label}</span>
      <input type="number" step={step} value={Math.round(value * 100) / 100} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#([0-9a-f]{6})$/i.test(value) ? value : "#000000";
  const none = value === "transparent";
  return (
    <label className="nc-field">
      <span>{label}</span>
      <span className="nc-row">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} />
        <button className="nc-mini" onClick={() => onChange(none ? "#ffffff" : "transparent")}>{none ? "Fill" : "None"}</button>
      </span>
    </label>
  );
}

export function PropertiesPanel() {
  const { doc, selected, updateEl, setDocProps, reorder, removeSelected } = useEditor();
  if (!doc) return <p className="nc-muted">No case open.</p>;
  const el = selected.length === 1 ? doc.elements.find((e) => e.id === selected[0]) : undefined;

  if (!el) {
    return (
      <div className="nc-props">
        {selected.length > 1 && <p className="nc-muted">{selected.length} items selected. Drag to move together, Delete to remove.</p>}
        <fieldset>
          <legend>{doc.kind === "board" ? "Case Board" : "Design"}</legend>
          <label className="nc-field">
            <span>Title</span>
            <input value={doc.title} onChange={(e) => useEditor.setState({ doc: { ...doc, title: e.target.value, updatedAt: Date.now() } })} />
          </label>
          <Color label="Background" value={doc.background} onChange={(v) => setDocProps({ background: v })} />
          {doc.kind === "design" && (
            <>
              <label className="nc-field">
                <span>Size</span>
                <select
                  value=""
                  onChange={(e) => {
                    const p = SIZE_PRESETS[Number(e.target.value)];
                    if (p) setDocProps({ width: p.w, height: p.h });
                    useEditor.getState().requestFit();
                  }}
                >
                  <option value="">{doc.width} × {doc.height}</option>
                  {SIZE_PRESETS.map((p, i) => (
                    <option key={p.label} value={i}>{p.label}</option>
                  ))}
                </select>
              </label>
              <Num label="Width" value={doc.width} onChange={(n) => setDocProps({ width: Math.max(50, n) })} />
              <Num label="Height" value={doc.height} onChange={(n) => setDocProps({ height: Math.max(50, n) })} />
            </>
          )}
        </fieldset>
        <p className="nc-muted">Tip: select something on the canvas to edit it here.</p>
      </div>
    );
  }

  const set = (patch: Partial<El>) => updateEl(el.id, patch);
  const hasText = el.text !== undefined;
  const bold = el.fontStyle?.includes("bold"), italic = el.fontStyle?.includes("italic");
  const style = (b: boolean, i: boolean) => [b && "bold", i && "italic"].filter(Boolean).join(" ") || "normal";

  return (
    <div className="nc-props">
      <fieldset>
        <legend>{el.name}</legend>
        <label className="nc-field">
          <span>Name</span>
          <input value={el.name} onChange={(e) => updateEl(el.id, { name: e.target.value }, false)} />
        </label>
        {el.type !== "connector" && (
          <div className="nc-grid2">
            <Num label="X" value={el.x} onChange={(n) => set({ x: n })} />
            <Num label="Y" value={el.y} onChange={(n) => set({ y: n })} />
            {!el.points && <Num label="W" value={el.width} onChange={(n) => set({ width: Math.max(5, n) })} />}
            {!el.points && <Num label="H" value={el.height} onChange={(n) => set({ height: Math.max(5, n) })} />}
            <Num label="Rotate" value={el.rotation} onChange={(n) => set({ rotation: n })} />
            <Num label="Opacity %" value={el.opacity * 100} onChange={(n) => set({ opacity: Math.min(1, Math.max(0, n / 100)) })} />
          </div>
        )}
      </fieldset>
      <fieldset>
        <legend>Look</legend>
        {!["line", "arrow", "pen", "connector", "image"].includes(el.type) && <Color label="Fill" value={el.fill} onChange={(v) => set({ fill: v })} />}
        <Color label="Stroke" value={el.stroke} onChange={(v) => set({ stroke: v, ...(el.type === "connector" ? { fill: v } : {}) })} />
        <Num label="Stroke width" value={el.strokeWidth} onChange={(n) => set({ strokeWidth: Math.max(0, n) })} />
        {["rect", "card", "image"].includes(el.type) && <Num label="Corner radius" value={el.cornerRadius ?? 0} onChange={(n) => set({ cornerRadius: Math.max(0, n) })} />}
      </fieldset>
      {hasText && (
        <fieldset>
          <legend>Text</legend>
          <label className="nc-field">
            <span>Text</span>
            <textarea rows={3} value={el.text} onChange={(e) => updateEl(el.id, { text: e.target.value }, false)} />
          </label>
          <label className="nc-field">
            <span>Font</span>
            <select value={el.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
              {FONTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <Num label="Size" value={el.fontSize ?? 18} onChange={(n) => set({ fontSize: Math.max(4, n) })} />
          <Color label="Color" value={el.textColor ?? "#000000"} onChange={(v) => set({ textColor: v })} />
          <div className="nc-row">
            <button className={`nc-mini ${bold ? "is-on" : ""}`} onClick={() => set({ fontStyle: style(!bold, !!italic) })}><b>B</b></button>
            <button className={`nc-mini ${italic ? "is-on" : ""}`} onClick={() => set({ fontStyle: style(!!bold, !italic) })}><i>I</i></button>
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} className={`nc-mini ${el.align === a ? "is-on" : ""}`} onClick={() => set({ align: a })}>{a.charAt(0).toUpperCase()}</button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>Arrange</legend>
        <div className="nc-row nc-wrap">
          <button onClick={() => reorder(el.id, "top")}>To front</button>
          <button onClick={() => reorder(el.id, "up")}>Forward</button>
          <button onClick={() => reorder(el.id, "down")}>Backward</button>
          <button onClick={() => reorder(el.id, "bottom")}>To back</button>
          <button onClick={() => set({ locked: !el.locked })}>{el.locked ? "Unlock" : "Lock"}</button>
          <button onClick={removeSelected} disabled={el.locked}>Delete</button>
        </div>
      </fieldset>
    </div>
  );
}
