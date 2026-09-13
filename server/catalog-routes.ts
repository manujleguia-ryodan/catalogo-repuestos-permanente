import type { Express, Request, Response } from "express";
import { getFreshSnapshot, readSnapshot, sheetLink, syncFromSheet } from "./catalog-store";

function payload(snapshot: Awaited<ReturnType<typeof readSnapshot>>, synced: boolean, error: string | null = null) {
  return { ...snapshot, sheetUrl: sheetLink(), synced, error };
}

export function registerCatalogRoutes(app: Express) {
  app.get("/api/ping", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/api/catalog", async (_req: Request, res: Response) => {
    const snapshot = await getFreshSnapshot();
    res.json({ ...snapshot, sheetUrl: sheetLink() });
  });

  app.post("/api/catalog/refresh", async (_req: Request, res: Response) => {
    try {
      const snapshot = await syncFromSheet();
      res.json(payload(snapshot, true));
    } catch (error) {
      const snapshot = readSnapshot();
      res.json(
        payload(
          snapshot,
          false,
          error instanceof Error ? error.message : "Error desconocido",
        ),
      );
    }
  });
}
