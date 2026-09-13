export interface Part {
  id: string;
  equipo: string;
  np: string;
  descripcion: string;
  sap: string;
  /** Enlace público de la foto ("" si la hoja no trae imagen). */
  imagen?: string;
  /** Cantidad sugerida en la hoja. 0 = sin sugerencia. Nunca se aparta sola. */
  cantidadRequerida?: number;
}

export interface CatalogData {
  rows: Part[];
  updatedAt: string | null;
  source: "sheet" | "seed";
  count: number;
  sheetUrl: string;
  /** false = al entrar no se pudo leer la hoja y estamos con la copia guardada. */
  synced?: boolean;
  /** ISO en que este dispositivo guardó la copia local. */
  cachedAt?: string;
}

const CACHE_KEY = "catalogo.data.v1";

/** Copia local en el dispositivo: permite abrir la app sin internet. */
export function readLocalCatalog(): CatalogData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogData;
    return Array.isArray(parsed.rows) && parsed.rows.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalCatalog(data: CatalogData): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...data, cachedAt: new Date().toISOString() }),
    );
  } catch {
    // cuota llena o modo privado: seguimos con los datos en memoria
  }
}

/** Texto tipo "hace 5 min" para el estado de sincronización. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "nunca";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Normaliza para buscar sin acentos, guiones ni espacios. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
