import type { CatalogData } from "./offline-cache";
import type { Kit } from "./kit-store";
import type { PerneriaSnapshot } from "../../../../server/perneria-store";

export type CatalogResponse = CatalogData & { synced?: boolean; error?: string | null };
export type SharedKitsResponse = { kits: Kit[]; available: boolean };

export class ApiRequestError extends Error {
  constructor(public status: number, public data: unknown) {
    super(typeof data === "object" && data && "error" in data && typeof data.error === "string" ? data.error : `Error del servidor (${status})`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  if (!response.ok) {
    let data: unknown = null;
    try { data = await response.json(); } catch { /* respuesta sin JSON */ }
    throw new ApiRequestError(response.status, data);
  }
  return (await response.json()) as T;
}

export const api = {
  catalog: {
    list: () => request<CatalogResponse>("/api/catalog"),
    refresh: () => request<CatalogResponse>("/api/catalog/refresh", { method: "POST" }),
  },
  ping: () => request<{ ok: true }>("/api/ping"),
  perneria: {
    list: () => request<PerneriaSnapshot>("/api/perneria"),
    refresh: () => request<PerneriaSnapshot>("/api/perneria/refresh", { method: "POST" }),
  },
  sharedKits: {
    list: () => request<SharedKitsResponse>("/api/shared-kits"),
    create: (kit: Omit<Kit, "origen">) => request<{ kit: Kit }>("/api/shared-kits", { method: "POST", body: JSON.stringify(kit) }),
    update: (kit: Omit<Kit, "origen">) => request<{ kit: Kit }>(`/api/shared-kits/${encodeURIComponent(kit.id)}`, { method: "PUT", body: JSON.stringify(kit) }),
    remove: (id: string) => request<{ ok: true }>(`/api/shared-kits/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
};
