import type { Express, Request, Response } from "express";
import { readPerneriaSheet } from "./perneria-store";

export function registerPerneriaRoutes(app: Express) {
  app.get("/api/perneria", async (_req: Request, res: Response) => {
    res.json(await readPerneriaSheet());
  });

  app.post("/api/perneria/refresh", async (_req: Request, res: Response) => {
    res.json(await readPerneriaSheet());
  });
}
