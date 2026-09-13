import { useSyncExternalStore } from "react";

/**
 * Cantidades apartadas por repuesto.
 * Viven SOLO en este dispositivo (localStorage): no se escriben en la hoja y
 * sobreviven a recargas, cierres de la app y cortes de red.
 */
const QTY_KEY = "catalogo.cantidades.v1";

export type QtyMap = Record<string, number>;

const MAX_QTY = 9999;

let cache: QtyMap = read();
const listeners = new Set<() => void>();

function read(): QtyMap {
  try {
    const raw = localStorage.getItem(QTY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: QtyMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const qty = Math.floor(Number(value));
      if (Number.isFinite(qty) && qty > 0) out[id] = Math.min(qty, MAX_QTY);
    }
    return out;
  } catch {
    return {};
  }
}

function commit(next: QtyMap): void {
  cache = next;
  try {
    localStorage.setItem(QTY_KEY, JSON.stringify(next));
  } catch {
    // cuota llena o modo privado: seguimos con los datos en memoria
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Otra pestaña de la misma app tocó las cantidades: nos ponemos al día.
  const onStorage = (event: StorageEvent) => {
    if (event.key === QTY_KEY) {
      cache = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Mapa completo de cantidades, reactivo. */
export function useQuantities(): QtyMap {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
}

/** Cantidad de un repuesto (0 = no apartado). */
export function useQuantity(id: string): number {
  return useSyncExternalStore(
    subscribe,
    () => cache[id] ?? 0,
    () => 0,
  );
}

/** Fija la cantidad; 0 o menos saca el repuesto de la lista. */
export function setQuantity(id: string, value: number): void {
  const qty = Math.max(0, Math.min(MAX_QTY, Math.floor(Number.isFinite(value) ? value : 0)));
  const next = { ...cache };
  if (qty <= 0) delete next[id];
  else next[id] = qty;
  commit(next);
}

export function addQuantity(id: string, delta: number): void {
  setQuantity(id, (cache[id] ?? 0) + delta);
}

export function removeQuantity(id: string): void {
  setQuantity(id, 0);
}

export function clearQuantities(): void {
  commit({});
}

/** Copia del mapa actual, para poder deshacer un borrado. */
export function getQuantities(): QtyMap {
  return { ...cache };
}

/** Vuelve a poner un mapa guardado (deshacer). */
export function restoreQuantities(previo: QtyMap): void {
  commit({ ...previo });
}
