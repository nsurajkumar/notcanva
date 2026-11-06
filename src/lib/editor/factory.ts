import { nanoid } from "nanoid";
import type { Doc, DocKind, El, ElType } from "./types";

export function newId() {
  return nanoid(10);
}

const NAMES: Record<ElType, string> = {
  rect: "Rectangle", ellipse: "Ellipse", triangle: "Triangle", line: "Line", arrow: "Arrow", text: "Text",
  image: "Image", sticky: "Sticky note", card: "Card", pen: "Drawing", connector: "Connector", frame: "Frame", star: "Star",
};

export function makeEl(type: ElType, x: number, y: number, over: Partial<El> = {}): El {
  const base: El = {
    id: newId(), type, name: NAMES[type], x, y, width: 200, height: 140, rotation: 0,
    fill: "#4f8ef7", stroke: "#1b3d8f", strokeWidth: 0, opacity: 1, visible: true, locked: false,
  };
  switch (type) {
    case "text":
      Object.assign(base, { width: 320, height: 60, text: "Double-click to edit", fontSize: 36, fontFamily: "Tahoma", fontStyle: "bold", align: "left", textColor: "#1a1a1a", fill: "transparent" });
      break;
    case "sticky":
      Object.assign(base, { width: 180, height: 160, fill: "#f7d154", text: "New note", fontSize: 18, fontFamily: "Tahoma", fontStyle: "normal", textColor: "#3a2f00", align: "left" });
      break;
    case "card":
      Object.assign(base, { width: 260, height: 130, fill: "#0e0e10", stroke: "#2c2c33", strokeWidth: 1, cornerRadius: 6, text: "Title\n• point one\n• point two", fontSize: 15, fontFamily: "Tahoma", fontStyle: "normal", textColor: "#f2f2f2", align: "left" });
      break;
    case "frame":
      Object.assign(base, { width: 600, height: 400, fill: "rgba(255,255,255,0.03)", stroke: "#6b6b78", strokeWidth: 1, text: "Frame", fontSize: 16, textColor: "#a0a0ad" });
      break;
    case "line":
    case "arrow":
      Object.assign(base, { width: 200, height: 0, points: [0, 0, 200, 0], stroke: "#222222", strokeWidth: 4, fill: "#222222" });
      break;
    case "pen":
      Object.assign(base, { width: 0, height: 0, points: [], stroke: "#e8e8e8", strokeWidth: 3 });
      break;
    case "connector":
      Object.assign(base, { width: 0, height: 0, stroke: "#9a9aa6", strokeWidth: 2, fill: "#9a9aa6" });
      break;
    case "ellipse":
      base.fill = "#f76b4f";
      break;
    case "triangle":
      base.fill = "#3fbf7f";
      break;
    case "star":
      Object.assign(base, { fill: "#f7b733", width: 160, height: 160 });
      break;
  }
  return { ...base, ...over };
}

export function makeDoc(kind: DocKind, title: string, width = 1080, height = 1080): Doc {
  const now = Date.now();
  return {
    id: newId(), title, kind, width, height,
    background: kind === "board" ? "#141416" : "#ffffff",
    elements: [], createdAt: now, updatedAt: now, deletedAt: null,
  };
}
