import { useRef, type ReactNode } from "react";
import { useWindows, type WinId } from "./windows";

export function XpWindow({ id, title, icon, children, minW = 220, minH = 120, bodyClass = "" }: { id: WinId; title: string; icon?: ReactNode; children: ReactNode; minW?: number; minH?: number; bodyClass?: string }) {
  const w = useWindows((s) => s.wins[id]);
  const { focus, close, minimize, toggleMax, move, resize, top } = useWindows.getState();
  const isTop = useWindows((s) => s.order[s.order.length - 1] === id);
  const drag = useRef<{ sx: number; sy: number; x: number; y: number; w: number; h: number; mode: "move" | "resize" } | null>(null);
  void top;
  if (!w || !w.open || w.min) return null;
  const z = id === "editor" ? 5 : useWindows.getState().order.indexOf(id) + 10;

  const start = (e: React.PointerEvent, mode: "move" | "resize") => {
    if ((e.target as HTMLElement).closest("button") && mode === "move") return;
    if (w.max && mode === "move") return;
    e.preventDefault();
    focus(id);
    drag.current = { sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h, mode };
    const mv = (ev: PointerEvent) => {
      const d = drag.current!;
      const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
      if (d.mode === "move") move(id, Math.max(-d.w + 80, d.x + dx), Math.max(0, d.y + dy));
      else resize(id, Math.max(minW, d.w + dx), Math.max(minH, d.h + dy));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const style = w.max ? { left: 0, top: 0, right: 0, bottom: "var(--taskbar-h)", zIndex: z } : { left: w.x, top: w.y, width: w.w, height: w.h, zIndex: z };

  return (
    <div className={`xp-window ${isTop ? "is-active" : ""} ${w.max ? "is-max" : ""}`} style={style} onPointerDown={() => focus(id)} role="dialog" aria-label={title}>
      <div className="xp-title" onPointerDown={(e) => start(e, "move")} onDoubleClick={() => toggleMax(id)}>
        <span className="xp-title-text">
          {icon && <span className="xp-title-icon">{icon}</span>}
          {title}
        </span>
        <span className="xp-title-buttons">
          <button aria-label="Minimize" className="xp-tb xp-tb-min" onClick={() => minimize(id)} />
          <button aria-label={w.max ? "Restore" : "Maximize"} className="xp-tb xp-tb-max" onClick={() => toggleMax(id)} />
          <button aria-label="Close" className="xp-tb xp-tb-close" onClick={() => close(id)} />
        </span>
      </div>
      <div className={`xp-body ${bodyClass}`}>{children}</div>
      {!w.max && <div className="xp-resize" onPointerDown={(e) => start(e, "resize")} aria-hidden />}
    </div>
  );
}
