import { useSyncExternalStore } from "react";
import type { Part } from "./offline-cache";
import { normalizeNp } from "./kit-store";

/**
 * Métricas de uso de repuestos: cuántas veces ha salido cada N/P en un pedido
 * enviado o en un kit creado desde este dispositivo.
 *
 * Hoy la fuente es local (localStorage). Es el único dato de uso real que
 * existe: la hoja no registra consumo. El día que haya métricas de verdad
 * (servidor, SAP, historial de pedidos) basta con cambiar `readUsage()` por
 * esa fuente: todo lo demás — `useTopParts` y la sección "Top repuestos" —
 * sigue igual porque solo consume un mapa `N/P -> veces usado`.
 */
const USAGE_KEY = "catalogo.usos.v1";

/** N/P normalizado -> número de veces que se pidió. */
export type UsageMap = Record<string, number>;

function read(): UsageMap {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: UsageMap = {};
    for (const [np, value] of Object.entries(parsed as Record<string, unknown>)) {
      const veces = Math.floor(Number(value));
      if (np && Number.isFinite(veces) && veces > 0) out[np] = veces;
    }
    return out;
  } catch {
    return {};
  }
}

let cache: UsageMap = read();
const listeners = new Set<() => void>();

function commit(next: UsageMap): void {
  cache = next;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  } catch {
    // cuota llena o modo privado: seguimos con los conteos en memoria
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === USAGE_KEY) {
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

export function useUsage(): UsageMap {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
}

/** Apunta un uso por cada N/P. Se llama al copiar un pedido o crear un kit. */
export function recordUsage(nps: string[]): void {
  const next = { ...cache };
  let cambio = false;
  for (const raw of nps) {
    const np = normalizeNp(raw ?? "");
    if (!np) continue;
    next[np] = (next[np] ?? 0) + 1;
    cambio = true;
  }
  if (cambio) commit(next);
}

export function clearUsage(): void {
  commit({});
}

export interface TopPart {
  part: Part;
  /** Veces que salió en un pedido; 0 cuando todavía es la lista de ejemplo. */
  veces: number;
}

export interface TopParts {
  items: TopPart[];
  /**
   * true = todavía no hay uso registrado y la lista es un ejemplo derivado de
   * la columna CANTIDAD REQUERIDA de la hoja, no de consumo real.
   */
  esEjemplo: boolean;
}

/**
 * Los repuestos más usados.
 *
 * 1. Si hay uso registrado en este dispositivo, manda ese conteo.
 * 2. Mientras no lo haya, se muestra una lista de ejemplo con los repuestos
 *    que la propia hoja marca con CANTIDAD REQUERIDA — datos reales del
 *    catálogo, nunca N/P inventados que luego no se puedan abrir.
 */
export function pickTopParts(rows: Part[], usage: UsageMap, limite = 10): TopParts {
  const conUso = rows
    .map((part) => ({ part, veces: usage[normalizeNp(part.np)] ?? 0 }))
    .filter((item) => item.veces > 0)
    .sort((a, b) => b.veces - a.veces || a.part.descripcion.localeCompare(b.part.descripcion, "es"));

  if (conUso.length > 0) return { items: conUso.slice(0, limite), esEjemplo: false };

  const ejemplo = rows
    .filter((part) => (part.cantidadRequerida ?? 0) > 0)
    .sort((a, b) => (b.cantidadRequerida ?? 0) - (a.cantidadRequerida ?? 0))
    .slice(0, limite)
    .map((part) => ({ part, veces: 0 }));

  return { items: ejemplo, esEjemplo: true };
}
