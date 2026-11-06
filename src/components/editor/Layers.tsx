import { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/editor/store";

export function LayersPanel() {
  const { doc, selected, select, updateEl, reorder, removeIds } = useEditor();
  const [renaming, setRenaming] = useState<string | null>(null);
  if (!doc) return null;
  const items = [...doc.elements].reverse();
  if (!items.length) return <p className="nc-muted">No layers yet. Pick a tool and click the canvas.</p>;
  return (
    <ul className="nc-layers">
      {items.map((el) => (
        <li key={el.id} className={selected.includes(el.id) ? "is-sel" : ""} onClick={(e) => select(e.shiftKey ? [...selected, el.id] : [el.id])}>
          <button className="nc-ico" title={el.visible ? "Hide" : "Show"} onClick={(e) => { e.stopPropagation(); updateEl(el.id, { visible: !el.visible }); }}>
            {el.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button className="nc-ico" title={el.locked ? "Unlock" : "Lock"} onClick={(e) => { e.stopPropagation(); updateEl(el.id, { locked: !el.locked }); }}>
            {el.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          {renaming === el.id ? (
            <input
              autoFocus
              defaultValue={el.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { updateEl(el.id, { name: e.target.value || el.name }); setRenaming(null); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
            />
          ) : (
            <span className="nc-layer-name" onDoubleClick={() => setRenaming(el.id)} title="Double-click to rename">{el.name}</span>
          )}
          <button className="nc-ico" title="Move up" onClick={(e) => { e.stopPropagation(); reorder(el.id, "up"); }}><ChevronUp size={13} /></button>
          <button className="nc-ico" title="Move down" onClick={(e) => { e.stopPropagation(); reorder(el.id, "down"); }}><ChevronDown size={13} /></button>
          <button className="nc-ico" title="Delete" onClick={(e) => { e.stopPropagation(); removeIds([el.id]); }}><Trash2 size={13} /></button>
        </li>
      ))}
    </ul>
  );
}
