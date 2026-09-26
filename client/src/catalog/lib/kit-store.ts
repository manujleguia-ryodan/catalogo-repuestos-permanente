import { useSyncExternalStore } from "react";

/**
 * Kits de mantenimiento: conjuntos de repuestos con sus cantidades, guardados
 * para repetir un trabajo sin volver a buscar pieza por pieza.
 *
 * Viven SOLO en este dispositivo (localStorage), igual que las cantidades.
 * No se escriben en la hoja y sobreviven a recargas y cortes de red.
 *
 * IMPORTANTE: un kit NO guarda el `id` del repuesto. Ese id lleva dentro la
 * posición de la fila en la hoja y la hoja crece y se reordena. El kit guarda
 * el N/P (y una copia de los datos para poder leerlo aunque la fila
 * desaparezca) y se vuelve a cruzar con el catálogo al usarlo.
 */
const KITS_KEY = "catalogo.kits.v1";

const MAX_QTY = 9999;

export interface KitItem {
  np: string;
  sap: string;
  descripcion: string;
  equipo: string;
  qty: number;
}

export interface Kit {
  id: string;
  /** Código visible para el usuario, p. ej. KIT-395DL-001. Único. */
  codigo: string;
  /** Nombre del trabajo, p. ej. "Cambio de cuchillas y cantoneras". */
  trabajo: string;
  equipo: string;
  items: KitItem[];
  /** Huella determinística del conjunto de componentes, ordenado por N/P. */
  fingerprint: string;
  creadoEn: string;
  actualizadoEn: string;
  origen: "local" | "compartido";
}

/**
 * Normaliza un N/P para comparar: quita espacios sobrantes y pasa a mayúsculas.
 * Los guiones SÍ cuentan: 123-456 y 123456 son referencias distintas en la hoja.
 */
export function normalizeNp(np: string): string {
  return np.replace(/\s+/g, "").toUpperCase();
}

/** Normaliza el equipo: espacios colapsados y mayúsculas. */
export function normalizeEquipo(equipo: string): string {
  return equipo.trim().replace(/\s+/g, " ").toUpperCase();
}

function compareNp(a: string, b: string): number {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

/**
 * Une repuestos repetidos (la hoja tiene N/P duplicados en varias filas) en una
 * sola línea sumando cantidades, y los devuelve ordenados por N/P.
 * Sin esto el mismo conjunto podría dar dos huellas distintas.
 */
export function mergeKitItems(items: KitItem[]): KitItem[] {
  const porNp = new Map<string, KitItem>();
  for (const item of items) {
    const np = normalizeNp(item.np);
    if (!np) continue;
    const qty = Math.trunc(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const previo = porNp.get(np);
    if (previo) {
      previo.qty = Math.min(MAX_QTY, previo.qty + qty);
    } else {
      porNp.set(np, {
        np: item.np.trim(),
        sap: (item.sap ?? "").trim(),
        descripcion: (item.descripcion ?? "").trim(),
        equipo: (item.equipo ?? "").trim(),
        qty: Math.min(MAX_QTY, qty),
      });
    }
  }
  return Array.from(porNp.values()).sort((a, b) => compareNp(normalizeNp(a.np), normalizeNp(b.np)));
}

/**
 * Huella de un kit: solo el conjunto de N/P, y nada más.
 *
 * No entran el nombre, equipo, descripción, SAP, cantidades ni el orden:
 * dos kits con los mismos componentes son EL MISMO KIT aunque se llamen
 * distinto o tengan cantidades diferentes.
 *
 *   123456|555555|789012
 */
export function kitFingerprint(equipo: string, items: KitItem[]): string {
  return mergeKitItems(items).map((item) => normalizeNp(item.np)).join("|");
}

// --- almacenamiento ---------------------------------------------------------

function sane(value: unknown): Kit | null {
  if (!value || typeof value !== "object") return null;
  const kit = value as Partial<Kit>;
  if (typeof kit.id !== "string" || typeof kit.codigo !== "string") return null;
  if (!Array.isArray(kit.items)) return null;
  const items = mergeKitItems(kit.items as KitItem[]);
  if (items.length === 0) return null;
  const equipo = typeof kit.equipo === "string" ? kit.equipo : "";
  return {
    id: kit.id,
    codigo: kit.codigo,
    trabajo: typeof kit.trabajo === "string" ? kit.trabajo : "",
    equipo,
    items,
    fingerprint: kitFingerprint(equipo, items),
    creadoEn: typeof kit.creadoEn === "string" ? kit.creadoEn : new Date().toISOString(),
    actualizadoEn: typeof kit.actualizadoEn === "string" ? kit.actualizadoEn : new Date().toISOString(),
    origen: kit.origen === "compartido" ? "compartido" : "local",
  };
}

function read(): Kit[] {
  try {
    const raw = localStorage.getItem(KITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sane).filter((kit): kit is Kit => kit !== null);
  } catch {
    return [];
  }
}

let cache: Kit[] = read();
const listeners = new Set<() => void>();

function commit(next: Kit[]): void {
  cache = next;
  try {
    localStorage.setItem(KITS_KEY, JSON.stringify(next));
  } catch {
    // cuota llena o modo privado: seguimos con los kits en memoria
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Otra pestaña de la misma app creó un kit: nos ponemos al día.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KITS_KEY) {
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

/** Todos los kits guardados, del más reciente al más antiguo. Reactivo. */
export function useKits(): Kit[] {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
}

export function getKits(): Kit[] {
  return cache;
}

// --- código único -----------------------------------------------------------

/** KIT-<EQUIPO>-001, con el correlativo siguiente libre para ese equipo. */
export function nextKitCode(equipo: string, kits: Kit[] = cache): string {
  const slug = normalizeEquipo(equipo).replace(/[^A-Z0-9]/g, "") || "GEN";
  const prefijo = `KIT-${slug}-`;
  const usados = new Set(kits.map((kit) => kit.codigo));
  let mayor = 0;
  for (const kit of kits) {
    if (!kit.codigo.startsWith(prefijo)) continue;
    const numero = Number(kit.codigo.slice(prefijo.length));
    if (Number.isFinite(numero) && numero > mayor) mayor = numero;
  }
  let siguiente = mayor + 1;
  while (usados.has(`${prefijo}${String(siguiente).padStart(3, "0")}`)) siguiente += 1;
  return `${prefijo}${String(siguiente).padStart(3, "0")}`;
}

// --- validación -------------------------------------------------------------

export interface KitDraft {
  trabajo: string;
  equipo: string;
  items: KitItem[];
}

/** Motivos por los que un kit todavía no se puede guardar. Vacío = válido. */
export function validateKit(draft: KitDraft): string[] {
  const errores: string[] = [];
  if (!draft.trabajo.trim()) errores.push("Falta el nombre del trabajo.");
  if (!draft.equipo.trim()) errores.push("Falta el equipo.");
  if (draft.items.length === 0) errores.push("El kit no contiene repuestos.");
  const sinNp = draft.items.filter((item) => !normalizeNp(item.np));
  if (sinNp.length > 0) {
    errores.push(
      sinNp.length === 1
        ? `1 repuesto no tiene N/P (${sinNp[0]?.descripcion || "sin descripción"}).`
        : `${sinNp.length} repuestos no tienen N/P.`,
    );
  }
  const sinCantidad = draft.items.filter((item) => !(Math.trunc(item.qty) > 0));
  if (sinCantidad.length > 0) errores.push("Hay repuestos con cantidad 0.");
  return errores;
}

// --- alta -------------------------------------------------------------------

export function findKitByFingerprint(fingerprint: string, kits: Kit[] = cache): Kit | undefined {
  return kits.find((kit) => kit.fingerprint === fingerprint);
}

export type CreateKitResult =
  | { ok: true; kit: Kit }
  | { ok: false; motivo: "duplicado"; kit: Kit }
  | { ok: false; motivo: "invalido"; errores: string[] };

/**
 * Crea el kit si no existe ya ese conjunto (equipo + N/P + cantidades).
 * Si existe, NO crea nada y devuelve el kit que ya lo cubre.
 */
export function createKit(draft: KitDraft): CreateKitResult {
  const errores = validateKit(draft);
  if (errores.length > 0) return { ok: false, motivo: "invalido", errores };

  const items = mergeKitItems(draft.items);
  const fingerprint = kitFingerprint(draft.equipo, items);
  const existente = findKitByFingerprint(fingerprint);
  if (existente) return { ok: false, motivo: "duplicado", kit: existente };

  const ahora = new Date().toISOString();
  const kit: Kit = {
    id: `kit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    codigo: nextKitCode(draft.equipo),
    trabajo: draft.trabajo.trim(),
    equipo: normalizeEquipo(draft.equipo),
    items,
    fingerprint,
    creadoEn: ahora,
    actualizadoEn: ahora,
    origen: "local",
  };
  commit([kit, ...cache]);
  return { ok: true, kit };
}

export type UpdateKitResult =
  | { ok: true; kit: Kit }
  | { ok: false; motivo: "duplicado"; kit: Kit }
  | { ok: false; motivo: "invalido"; errores: string[] };

/** Actualiza un kit local manteniendo su código e identidad. */
export function updateKit(id: string, draft: KitDraft): UpdateKitResult {
  const errores = validateKit(draft);
  if (errores.length > 0) return { ok: false, motivo: "invalido", errores };
  const actual = cache.find((kit) => kit.id === id);
  if (!actual) return { ok: false, motivo: "invalido", errores: ["El kit ya no existe en este dispositivo."] };
  const items = mergeKitItems(draft.items);
  const fingerprint = kitFingerprint(draft.equipo, items);
  const existente = cache.find((kit) => kit.id !== id && kit.fingerprint === fingerprint);
  if (existente) return { ok: false, motivo: "duplicado", kit: existente };
  const kit: Kit = {
    ...actual,
    trabajo: draft.trabajo.trim(),
    equipo: normalizeEquipo(draft.equipo),
    items,
    fingerprint,
    actualizadoEn: new Date().toISOString(),
    origen: "local",
  };
  commit(cache.map((item) => (item.id === id ? kit : item)));
  return { ok: true, kit };
}

export function deleteKit(id: string): void {
  const next = cache.filter((kit) => kit.id !== id);
  if (next.length !== cache.length) commit(next);
}

/** Suma de unidades de un kit (los tipos distintos son `kit.items.length`). */
export function kitUnits(kit: Kit): number {
  return kit.items.reduce((total, item) => total + item.qty, 0);
}
