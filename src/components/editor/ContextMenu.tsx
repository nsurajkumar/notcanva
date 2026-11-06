import { useEffect, useRef } from "react";
import { useEditor } from "@/lib/editor/store";
import { align, bringSelected, copyStyle, flip, hasStyleClip, pasteStyle, selectAll, toggleLock } from "@/lib/editor/actions";

export function ContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const st = useEditor();
  const has = st.selected.length > 0;
  useEffect(() => {
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    setTimeout(() => window.addEventListener("pointerdown", close), 0);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  const item = (label: string, fn: () => void, hint = "", disabled = false) => (
    <button className="nc-menu-item" disabled={disabled} onClick={() => { fn(); onClose(); }}>
      <span>{label}</span>
      <span className="nc-muted">{hint}</span>
    </button>
  );
  const sep = <div className="nc-menu-sep" />;
  return (
    <div ref={ref} className="nc-menu-pop nc-ctx" style={{ left: Math.min(x, (ref.current?.parentElement?.clientWidth ?? 9999) - 240), top: Math.max(4, Math.min(y, (ref.current?.parentElement?.clientHeight ?? 9999) - 500)) }} onContextMenu={(e) => e.preventDefault()}>
      {item("Copy", st.copy, "Ctrl+C", !has)}
      {item("Paste", st.paste, "Ctrl+V", !st.clipboard.length)}
      {item("Duplicate", st.duplicate, "Ctrl+D", !has)}
      {item("Delete", st.removeSelected, "Del", !has)}
      {sep}
      {item("Copy style", () => copyStyle(), "Ctrl+Alt+C", !has)}
      {item("Paste style", pasteStyle, "Ctrl+Alt+V", !has || !hasStyleClip())}
      {sep}
      {item("Bring to front", () => bringSelected("top"), "Ctrl+Shift+]", !has)}
      {item("Bring forward", () => bringSelected("up"), "Ctrl+]", !has)}
      {item("Send backward", () => bringSelected("down"), "Ctrl+[", !has)}
      {item("Send to back", () => bringSelected("bottom"), "Ctrl+Shift+[", !has)}
      {sep}
      {item("Align centre", () => { align("hcenter"); align("vcenter"); }, "", !has)}
      {item("Flip horizontal", () => flip("x"), "Shift+H", !has)}
      {item("Flip vertical", () => flip("y"), "Shift+V", !has)}
      {item("Lock / unlock", toggleLock, "Ctrl+L", !has)}
      {sep}
      {item("Select all", selectAll, "Ctrl+A")}
    </div>
  );
}
