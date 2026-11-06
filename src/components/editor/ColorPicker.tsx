import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/lib/editor/store";

const PALETTE = [
  "#000000", "#545454", "#737373", "#a6a6a6", "#d9d9d9", "#ffffff",
  "#ff3131", "#ff5757", "#ff66c4", "#cb6ce6", "#8c52ff", "#5e17eb",
  "#03989e", "#00c2cb", "#5ce1e6", "#38b6ff", "#5170ff", "#004aad",
  "#00bf63", "#7ed957", "#c1ff72", "#ffde59", "#ffbd59", "#ff914d",
];

export function ColorPicker({ value, onChange, label, allowNone = true, icon }: { value: string; onChange: (v: string) => void; label: string; allowNone?: boolean; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const doc = useEditor((s) => s.doc);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const docColors = [...new Set((doc?.elements ?? []).flatMap((e) => [e.fill, e.textColor, e.stroke]).filter((c): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c)))].slice(0, 12);
  const hex = /^#([0-9a-f]{6})$/i.test(value) ? value : "#000000";
  const swatch = (c: string) => (
    <button key={c} className={`nc-cswatch ${c === value ? "is-on" : ""}`} style={{ background: c }} title={c} aria-label={c} onClick={() => { onChange(c); setOpen(false); }} />
  );
  return (
    <div className="nc-cp" ref={ref}>
      <button className="nc-cbtn" title={label} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {icon}
        <span className={`nc-cbar ${value === "transparent" ? "is-none" : ""}`} style={{ background: value === "transparent" ? undefined : value }} />
      </button>
      {open && (
        <div className="nc-cpop">
          <div className="nc-cp-title">{label}</div>
          <div className="nc-crow">
            <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label="Custom color" />
            <input className="nc-hex" value={value} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
            {allowNone && <button className="nc-mini" onClick={() => { onChange("transparent"); setOpen(false); }}>None</button>}
          </div>
          {!!docColors.length && (
            <>
              <div className="nc-cp-sub">Document colors</div>
              <div className="nc-cgrid">{docColors.map(swatch)}</div>
            </>
          )}
          <div className="nc-cp-sub">Default colors</div>
          <div className="nc-cgrid">{PALETTE.map(swatch)}</div>
        </div>
      )}
    </div>
  );
}
