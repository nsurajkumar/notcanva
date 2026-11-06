import Dexie, { type Table } from "dexie";
import type { Doc } from "./editor/types";

export interface Asset {
  id: string;
  blob: Blob;
  type: string;
  createdAt: number;
}

class NotcanvaDB extends Dexie {
  designs!: Table<Doc, string>;
  assets!: Table<Asset, string>;
  constructor() {
    super("notcanva");
    this.version(1).stores({ designs: "id, updatedAt, deletedAt, kind", assets: "id" });
  }
}

let _db: NotcanvaDB | null = null;
export function db() {
  if (!_db) _db = new NotcanvaDB();
  return _db;
}

export async function saveDoc(d: Doc) {
  await db().designs.put(d);
}

export async function requestPersist(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}

const urlCache = new Map<string, string>();
export async function assetUrl(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const a = await db().assets.get(id);
  if (!a) return null;
  const u = URL.createObjectURL(a.blob);
  urlCache.set(id, u);
  return u;
}

/** Remove assets no longer referenced by any design. */
export async function gcAssets() {
  const docs = await db().designs.toArray();
  const used = new Set<string>();
  docs.forEach((d) => d.elements.forEach((e) => e.assetId && used.add(e.assetId)));
  const all = await db().assets.toCollection().primaryKeys();
  await db().assets.bulkDelete(all.filter((k) => !used.has(k)));
}
