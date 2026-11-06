import Konva from "konva";
import type { Doc } from "./editor/types";

let stage: Konva.Stage | null = null;
export function registerStage(s: Konva.Stage | null) {
  stage = s;
}

function contentBounds(doc: Doc) {
  if (doc.kind === "design" || !doc.elements.length) return { x: 0, y: 0, w: doc.width, h: doc.height };
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const e of doc.elements) {
    if (!e.visible || e.type === "connector") continue;
    const pts = e.points?.length ? e.points : [0, 0, e.width, e.height];
    for (let i = 0; i < pts.length; i += 2) {
      const px = pts[i] ?? 0, py = pts[i + 1] ?? 0;
      x1 = Math.min(x1, e.x + px); y1 = Math.min(y1, e.y + py);
      x2 = Math.max(x2, e.x + px); y2 = Math.max(y2, e.y + py);
    }
    x2 = Math.max(x2, e.x + e.width); y2 = Math.max(y2, e.y + e.height);
  }
  if (!isFinite(x1)) return { x: 0, y: 0, w: 800, h: 600 };
  const pad = 40;
  return { x: x1 - pad, y: y1 - pad, w: x2 - x1 + pad * 2, h: y2 - y1 + pad * 2 };
}

export function renderDataUrl(doc: Doc, opts: { mime: "image/png" | "image/jpeg"; scale: number; quality?: number }): string {
  if (!stage) throw new Error("Canvas not ready");
  const ui = stage.find(".ui");
  ui.forEach((n) => n.hide());
  const bgNode = stage.findOne(".board-bg");
  bgNode?.hide();
  const b = contentBounds(doc);
  const sx = stage.scaleX();
  const pos = stage.position();
  // Temporarily reset view so we can render in doc coordinates.
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  const layer = stage.findOne<Konva.Layer>(".content")!;
  // Add a temporary background rect so JPGs/boards are not transparent.
  const bg = new Konva.Rect({ x: b.x, y: b.y, width: b.w, height: b.h, fill: doc.background, listening: false });
  layer.add(bg);
  bg.moveToBottom();
  layer.draw();
  const url = layer.toDataURL({ x: b.x, y: b.y, width: b.w, height: b.h, pixelRatio: opts.scale, mimeType: opts.mime, quality: opts.quality ?? 0.92 });
  bg.destroy();
  stage.scale({ x: sx, y: sx });
  stage.position(pos);
  ui.forEach((n) => n.show());
  bgNode?.show();
  stage.batchDraw();
  return url;
}

export function thumbnail(doc: Doc): string | undefined {
  try {
    const b = contentBounds(doc);
    return renderDataUrl(doc, { mime: "image/jpeg", scale: Math.min(1, 240 / Math.max(b.w, b.h)), quality: 0.7 });
  } catch {
    return undefined;
  }
}

function safeName(t: string) {
  return (t || "design").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-") || "design";
}

export function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportDoc(doc: Doc, format: "png" | "jpg" | "pdf", scale: number, quality = 0.92) {
  const name = safeName(doc.title);
  if (format === "png") return download(renderDataUrl(doc, { mime: "image/png", scale }), `${name}.png`);
  if (format === "jpg") return download(renderDataUrl(doc, { mime: "image/jpeg", scale, quality }), `${name}.jpg`);
  const { jsPDF } = await import("jspdf");
  const b = contentBounds(doc);
  const url = renderDataUrl(doc, { mime: "image/jpeg", scale, quality: 0.95 });
  const pdf = new jsPDF({ orientation: b.w > b.h ? "landscape" : "portrait", unit: "px", format: [b.w, b.h], hotfixes: ["px_scaling"] });
  pdf.addImage(url, "JPEG", 0, 0, b.w, b.h);
  pdf.save(`${name}.pdf`);
}
