import { useRef } from "react";
import { MousePointer2, Hand, Type, Square, Circle, Triangle, Minus, MoveRight, StickyNote, PenLine, Spline, Frame, Eraser, ImagePlus, CreditCard, Star } from "lucide-react";
import { useEditor, type Tool } from "@/lib/editor/store";
import { addImageFile } from "./CanvasStage";

export const TOOL_LIST: { id: Tool; label: string; key: string; Icon: typeof Square }[] = [
  { id: "select", label: "Select", key: "V", Icon: MousePointer2 },
  { id: "hand", label: "Hand (hold Space)", key: "H", Icon: Hand },
  { id: "text", label: "Text", key: "T", Icon: Type },
  { id: "rect", label: "Rectangle", key: "R", Icon: Square },
  { id: "ellipse", label: "Ellipse", key: "O", Icon: Circle },
  { id: "triangle", label: "Triangle", key: "Y", Icon: Triangle },
  { id: "star", label: "Star", key: "S", Icon: Star },
  { id: "line", label: "Line", key: "L", Icon: Minus },
  { id: "arrow", label: "Arrow", key: "A", Icon: MoveRight },
  { id: "sticky", label: "Sticky note", key: "N", Icon: StickyNote },
  { id: "card", label: "Card", key: "K", Icon: CreditCard },
  { id: "pen", label: "Pen", key: "P", Icon: PenLine },
  { id: "connector", label: "Connector", key: "C", Icon: Spline },
  { id: "frame", label: "Frame", key: "F", Icon: Frame },
  { id: "eraser", label: "Eraser", key: "E", Icon: Eraser },
];

export function ImageButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className={className} title="Add image (or drop onto canvas)" onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await addImageFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function ToolsPanel() {
  const { tool, setTool } = useEditor();
  return (
    <div className="nc-tools">
      {TOOL_LIST.map(({ id, label, key, Icon }) => (
        <button key={id} className={`nc-tool ${tool === id ? "is-on" : ""}`} title={`${label} (${key})`} aria-label={label} aria-pressed={tool === id} onClick={() => setTool(id)}>
          <Icon size={18} />
        </button>
      ))}
      <ImageButton className="nc-tool">
        <ImagePlus size={18} />
      </ImageButton>
    </div>
  );
}

const PEN_COLORS = ["#e8e8e8", "#f7d154", "#ff6b6b", "#4fa3ff", "#3fbf7f", "#111111"];

/** Floating bottom dock for Case Boards (whiteboard mode). */
export function BoardDock() {
  const { tool, setTool, penColor, setPenColor, doc, addEl } = useEditor();
  void doc;
  void addEl;
  const group1: Tool[] = ["select", "hand", "frame", "connector"];
  const group2: Tool[] = ["text", "pen", "eraser", "sticky", "card", "rect", "ellipse", "arrow"];
  const btn = (id: Tool) => {
    const t = TOOL_LIST.find((x) => x.id === id)!;
    return (
      <button key={id} className={`nc-dock-btn ${tool === id ? "is-on" : ""}`} title={`${t.label} (${t.key})`} aria-label={t.label} onClick={() => setTool(id)}>
        <t.Icon size={22} />
      </button>
    );
  };
  return (
    <div className="nc-dock" onPointerDown={(e) => e.stopPropagation()}>
      {group1.map(btn)}
      <span className="nc-dock-sep" />
      {group2.map(btn)}
      <ImageButton className="nc-dock-btn">
        <ImagePlus size={22} />
      </ImageButton>
      {tool === "pen" && (
        <span className="nc-dock-colors">
          {PEN_COLORS.map((c) => (
            <button key={c} aria-label={`Pen color ${c}`} className={`nc-swatch ${penColor === c ? "is-on" : ""}`} style={{ background: c }} onClick={() => setPenColor(c)} />
          ))}
        </span>
      )}
    </div>
  );
}
