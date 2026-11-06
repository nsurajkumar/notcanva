import JSZip from "jszip";
import type { Doc } from "./editor/types";
import { db } from "./db";
import { newId } from "./editor/factory";
import { download } from "./export";

/** .notcanva = zip with design.json + images/<assetId> */
export async function backupDoc(doc: Doc) {
  const zip = new JSZip();
  zip.file("design.json", JSON.stringify({ format: "notcanva", version: 1, doc }, null, 2));
  const ids = [...new Set(doc.elements.map((e) => e.assetId).filter(Boolean) as string[])];
  for (const id of ids) {
    const a = await db().assets.get(id);
    if (a) zip.file(`images/${id}`, a.blob, { comment: a.type });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  download(url, `${(doc.title || "design").replace(/[^a-z0-9-_]/gi, "-")}.notcanva`);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function restoreFile(file: File): Promise<Doc> {
  const zip = await JSZip.loadAsync(file);
  const json = await zip.file("design.json")?.async("string");
  if (!json) throw new Error("Not a notcanva backup (design.json missing)");
  const parsed = JSON.parse(json);
  const doc: Doc = parsed.doc;
  if (!doc || !Array.isArray(doc.elements)) throw new Error("Backup is damaged");
  const idMap = new Map<string, string>();
  const files = zip.folder("images");
  if (files) {
    const entries: { name: string; f: JSZip.JSZipObject }[] = [];
    files.forEach((name, f) => entries.push({ name, f }));
    for (const { name, f } of entries) {
      const blob = await f.async("blob");
      const id = newId();
      idMap.set(name, id);
      await db().assets.put({ id, blob, type: f.comment || "image/png", createdAt: Date.now() });
    }
  }
  const restored: Doc = {
    ...doc,
    id: newId(),
    title: `${doc.title} (restored)`,
    deletedAt: null,
    updatedAt: Date.now(),
    elements: doc.elements.map((e) => (e.assetId ? { ...e, assetId: idMap.get(e.assetId) ?? e.assetId } : e)),
  };
  await db().designs.put(restored);
  return restored;
}
