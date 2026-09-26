import type { Express, Request, Response } from "express";
import { asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { sharedKits } from "../drizzle/schema";

type KitItem = {
  np: string;
  sap: string;
  descripcion: string;
  equipo: string;
  qty: number;
};

type KitPayload = {
  id?: string;
  codigo: string;
  trabajo: string;
  equipo: string;
  fingerprint: string;
  items: KitItem[];
};

export function cleanSharedKitPayload(value: unknown): KitPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<KitPayload>;
  if (
    typeof input.codigo !== "string" ||
    typeof input.trabajo !== "string" ||
    typeof input.equipo !== "string" ||
    typeof input.fingerprint !== "string" ||
    !Array.isArray(input.items) ||
    !input.codigo.trim() ||
    !input.trabajo.trim() ||
    !input.equipo.trim() ||
    !input.fingerprint.trim()
  ) return null;

  const items = input.items.filter((item): item is KitItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<KitItem>;
    return typeof candidate.np === "string" && Number.isFinite(Number(candidate.qty)) && Number(candidate.qty) > 0;
  }).map((item) => ({
    np: item.np.trim(),
    sap: typeof item.sap === "string" ? item.sap.trim() : "",
    descripcion: typeof item.descripcion === "string" ? item.descripcion.trim() : "",
    equipo: typeof item.equipo === "string" ? item.equipo.trim() : "",
    qty: Math.trunc(Number(item.qty)),
  }));

  return {
    id: typeof input.id === "string" ? input.id : undefined,
    codigo: input.codigo.trim(),
    trabajo: input.trabajo.trim(),
    equipo: input.equipo.trim(),
    fingerprint: input.fingerprint.trim(),
    items,
  };
}

function serialize(row: typeof sharedKits.$inferSelect) {
  const items = JSON.parse(row.items) as KitItem[];
  return {
    id: row.id,
    codigo: row.codigo,
    trabajo: row.trabajo,
    equipo: row.equipo,
    fingerprint: componentFingerprint(items),
    items,
    creadoEn: row.createdAt.toISOString(),
    actualizadoEn: row.updatedAt.toISOString(),
    origen: "compartido" as const,
  };
}

function componentFingerprint(items: KitItem[]): string {
  return items.map((item) => item.np.replace(/\s+/g, "").toUpperCase()).filter(Boolean).sort().join("|");
}

function makeId(): string {
  return `shared_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function uniqueSharedCode(requested: string, equipo: string, rows: Array<{ codigo: string }>): string {
  const used = new Set(rows.map((row) => row.codigo));
  if (!used.has(requested)) return requested;
  const slug = equipo.trim().replace(/[^A-Za-z0-9]+/g, "").toUpperCase() || "GEN";
  const prefix = `KIT-${slug}-`;
  let number = 1;
  while (used.has(`${prefix}${String(number).padStart(3, "0")}`)) number += 1;
  return `${prefix}${String(number).padStart(3, "0")}`;
}

export function registerSharedKitRoutes(app: Express) {
  app.get("/api/shared-kits", async (_req: Request, res: Response) => {
    const db = await getDb();
    if (!db) return res.json({ kits: [], available: false });
    const rows = await db.select().from(sharedKits).orderBy(asc(sharedKits.updatedAt));
    return res.json({ kits: rows.map(serialize), available: true });
  });

  app.post("/api/shared-kits", async (req: Request, res: Response) => {
    const db = await getDb();
    const payload = cleanSharedKitPayload(req.body);
    if (!db) return res.status(503).json({ error: "Base de datos no disponible" });
    if (!payload || payload.items.length === 0) return res.status(400).json({ error: "Kit inválido" });
    const canonical = componentFingerprint(payload.items);
    const rows = await db.select().from(sharedKits);
    const duplicado = rows.find((row) => componentFingerprint(JSON.parse(row.items) as KitItem[]) === canonical);
    if (duplicado) return res.status(409).json({ error: "Ya existe un kit con los mismos componentes", kit: serialize(duplicado) });
    const id = makeId();
    const codigo = uniqueSharedCode(payload.codigo, payload.equipo, rows);
    await db.insert(sharedKits).values({
      id,
      codigo,
      trabajo: payload.trabajo,
      equipo: payload.equipo,
      fingerprint: canonical,
      items: JSON.stringify(payload.items),
    });
    const [row] = await db.select().from(sharedKits).where(eq(sharedKits.id, id)).limit(1);
    return res.status(201).json({ kit: row ? serialize(row) : null });
  });

  app.put("/api/shared-kits/:id", async (req: Request, res: Response) => {
    const db = await getDb();
    const payload = cleanSharedKitPayload(req.body);
    if (!db) return res.status(503).json({ error: "Base de datos no disponible" });
    if (!payload || payload.items.length === 0) return res.status(400).json({ error: "Kit inválido" });
    const canonical = componentFingerprint(payload.items);
    const rows = await db.select().from(sharedKits);
    const duplicado = rows.find((row) => row.id !== req.params.id && componentFingerprint(JSON.parse(row.items) as KitItem[]) === canonical);
    if (duplicado) return res.status(409).json({ error: "Ya existe un kit con los mismos componentes", kit: serialize(duplicado) });
    await db.update(sharedKits).set({
      codigo: payload.codigo,
      trabajo: payload.trabajo,
      equipo: payload.equipo,
      fingerprint: canonical,
      items: JSON.stringify(payload.items),
    }).where(eq(sharedKits.id, req.params.id));
    const [row] = await db.select().from(sharedKits).where(eq(sharedKits.id, req.params.id)).limit(1);
    return row ? res.json({ kit: serialize(row) }) : res.status(404).json({ error: "Kit no encontrado" });
  });

  app.delete("/api/shared-kits/:id", async (req: Request, res: Response) => {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Base de datos no disponible" });
    await db.delete(sharedKits).where(eq(sharedKits.id, req.params.id));
    return res.json({ ok: true });
  });
}
