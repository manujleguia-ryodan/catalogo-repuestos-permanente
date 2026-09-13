import type { CatalogData } from "./offline-cache";

export type CatalogResponse = CatalogData & { synced?: boolean; error?: string | null };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
  return (await response.json()) as T;
}

export const api = {
  catalog: {
    list: () => request<CatalogResponse>("/api/catalog"),
    refresh: () => request<CatalogResponse>("/api/catalog/refresh", { method: "POST" }),
  },
  ping: () => request<{ ok: true }>("/api/ping"),
};
