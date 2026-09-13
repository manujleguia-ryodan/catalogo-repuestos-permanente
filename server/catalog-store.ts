import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCsv } from "./csv";
import seed from "./catalog-seed.json";
import imageOverrides from "./image-overrides.json";

/** Una fila del catálogo de repuestos. */
export interface Part {
  id: string;
  equipo: string;
  np: string;
  descripcion: string;
  sap: string;
  /** Enlace público de la foto del repuesto ("" si la hoja no trae imagen). */
  imagen: string;
  /** Cantidad sugerida en la hoja. 0 = sin sugerencia. Nunca se aparta sola. */
  cantidadRequerida: number;
}

/** Estructura persistida en el archivo JSON temporal. */
export interface CatalogSnapshot {
  rows: Part[];
  /** ISO de la última sincronización exitosa con Google Sheets (null si nunca). */
  updatedAt: string | null;
  /** "sheet" = descargado de la nube, "seed" = copia incluida en la app. */
  source: "sheet" | "seed";
  /** Total de filas. */
  count: number;
}

const SHEET_ID = process.env.SHEET_ID ?? "19b_CZw2cJM27ltJlV2b-f73m7TZ-Vth0";
const SHEET_GID = process.env.SHEET_GID ?? "1920919101";

/** cwd tipado de forma segura: este archivo también se typechequea desde el paquete mobile. */
const cwd = (globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() ?? ".";

const CANDIDATE_PATHS = [
  process.env.CATALOG_CACHE_FILE,
  path.resolve(cwd, "server/catalog.json"),
  path.join(os.tmpdir(), "catalogo-repuestos", "catalog.json"),
].filter((p): p is string => Boolean(p));

let cachePath: string | null = null;

/** Devuelve la primera ruta escribible para el JSON temporal. */
function resolveCachePath(): string {
  if (cachePath) return cachePath;
  for (const candidate of CANDIDATE_PATHS) {
    try {
      fs.mkdirSync(path.dirname(candidate), { recursive: true });
      fs.accessSync(path.dirname(candidate), fs.constants.W_OK);
      cachePath = candidate;
      return candidate;
    } catch {
      // siguiente candidato
    }
  }
  cachePath = path.join(os.tmpdir(), "catalog.json");
  return cachePath;
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Quita acentos y signos para comparar encabezados sin sorpresas. */
function headerKey(value: string): string {
  return clean(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Convierte cualquier enlace de Google Drive a la variante que sí se pinta
 * dentro de un <img>. Los demás enlaces se devuelven tal cual.
 */
export function normalizeImageUrl(raw: string): string {
  const url = clean(raw);
  if (!url) return "";

  // Solo enlaces absolutos: un nombre de archivo suelto ("foto.jpg") se pediría
  // contra el propio dominio y devolvería el HTML de la app, no una imagen.
  if (!/^https?:\/\//i.test(url)) return "";

  if (!/drive\.google\.com|googleusercontent\.com/i.test(url)) return url;

  const id =
    /\/file\/d\/([\w-]{10,})/.exec(url)?.[1] ??
    /[?&]id=([\w-]{10,})/.exec(url)?.[1] ??
    /\/d\/([\w-]{10,})/.exec(url)?.[1] ??
    "";
  if (!id) return url;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
}

/** Fotos verificadas a mano, indexadas por N/P. Ver data/image-overrides.json. */
const IMAGE_BY_NP: Record<string, string> = imageOverrides.imagenes;

/**
 * Decide qué foto le toca a una fila.
 *
 * La hoja manda: si su columna IMAGEN_URL trae un enlace válido, ese se usa.
 * Solo cuando viene vacía se recurre a la foto verificada a mano para ese N/P.
 * Así, el día que se peguen las URLs en la hoja, esta tabla deja de intervenir
 * sin tener que tocar el código.
 */
export function resolveImagen(np: string, rawImagen: string): string {
  const fromSheet = normalizeImageUrl(rawImagen);
  if (fromSheet) return fromSheet;
  const override = IMAGE_BY_NP[clean(np).toUpperCase()];
  return override ? normalizeImageUrl(override) : "";
}

/** Entero >= 0; vacío, texto o negativo se convierten en 0. */
function toQty(raw: string): number {
  const digits = clean(raw).replace(/[^\d]/g, "");
  if (!digits) return 0;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 9999) : 0;
}

/** Posición de cada dato dentro de la fila, leída del encabezado de la hoja. */
interface ColumnMap {
  equipo: number;
  np: number;
  descripcion: number;
  sap: number;
  imagen: number;
  cantidad: number;
}

const FALLBACK_COLUMNS: ColumnMap = {
  equipo: 0,
  np: 1,
  descripcion: 2,
  sap: 3,
  imagen: 4,
  cantidad: 5,
};

/**
 * Mapea las columnas por nombre de encabezado, para que agregar columnas
 * nuevas a la hoja (IMAGEN_URL, CANTIDAD REQUERIDA…) no rompa la lectura.
 * Devuelve null si la primera fila no parece un encabezado.
 */
function mapColumns(header: string[] | undefined): ColumnMap | null {
  if (!header) return null;
  const keys = header.map(headerKey);
  const find = (test: (key: string) => boolean): number => keys.findIndex(test);

  const columns: ColumnMap = {
    equipo: find((k) => k.includes("EQUIPO")),
    np: find((k) => k.startsWith("NP") || k.includes("NPFABRICANTE") || k.includes("NUMEROPARTE")),
    descripcion: find((k) => k.includes("DESCRIPCION") || k.includes("REPUESTO")),
    sap: find((k) => k.includes("SAP")),
    imagen: find((k) => k.includes("IMAGEN") || k.includes("FOTO") || k.includes("IMAGE")),
    cantidad: find((k) => k.includes("CANTIDAD")),
  };

  const reconocidas = [columns.equipo, columns.np, columns.descripcion, columns.sap].filter(
    (index) => index >= 0,
  );
  return reconocidas.length >= 2 ? columns : null;
}

function normalizeRows(raw: string[][]): Part[] {
  const rows: Part[] = [];
  const [header, ...body] = raw;
  const mapped = mapColumns(header);
  const columns = mapped ?? FALLBACK_COLUMNS;
  const data = mapped ? body : raw;

  const at = (cells: string[], index: number): string => (index >= 0 ? (cells[index] ?? "") : "");

  for (const cells of data) {
    const equipo = clean(at(cells, columns.equipo)).toUpperCase();
    const np = clean(at(cells, columns.np));
    const descripcion = clean(at(cells, columns.descripcion));
    const sap = clean(at(cells, columns.sap));
    if (!equipo && !np && !descripcion && !sap) continue;
    rows.push({
      id: `${equipo}|${np}|${sap}|${rows.length}`,
      equipo,
      np,
      descripcion,
      sap,
      imagen: resolveImagen(np, at(cells, columns.imagen)),
      cantidadRequerida: toQty(at(cells, columns.cantidad)),
    });
  }
  return rows;
}

/** Fila de la copia incluida: puede venir sin los campos nuevos. */
type SeedRow = Omit<Part, "id" | "imagen" | "cantidadRequerida"> &
  Partial<Pick<Part, "imagen" | "cantidadRequerida">>;

function withIds(rows: SeedRow[]): Part[] {
  return rows.map((row, index) => ({
    ...row,
    imagen: resolveImagen(row.np, row.imagen ?? ""),
    cantidadRequerida: row.cantidadRequerida ?? 0,
    id: `${row.equipo}|${row.np}|${row.sap}|${index}`,
  }));
}

function seedSnapshot(): CatalogSnapshot {
  const rows = withIds(seed.rows as SeedRow[]);
  return { rows, updatedAt: null, source: "seed", count: rows.length };
}

/** Lee el JSON temporal; si no existe o está corrupto, cae a la copia incluida. */
export function readSnapshot(): CatalogSnapshot {
  try {
    const file = resolveCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as CatalogSnapshot;
      if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
        // Una caché escrita por una versión anterior no trae los campos nuevos.
        const rows = parsed.rows.map((row) => ({
          ...row,
          imagen: resolveImagen(row.np, row.imagen ?? ""),
          cantidadRequerida: row.cantidadRequerida ?? 0,
        }));
        return { ...parsed, rows, count: rows.length };
      }
    }
  } catch {
    // cae al seed
  }
  return seedSnapshot();
}

function writeSnapshot(snapshot: CatalogSnapshot): void {
  try {
    const file = resolveCachePath();
    fs.writeFileSync(file, JSON.stringify(snapshot), "utf8");
  } catch (error) {
    console.warn("No se pudo escribir la caché JSON:", error);
  }
}

function sheetUrls(): string[] {
  if (!SHEET_ID) return [];
  return [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`,
  ];
}

/**
 * Descarga la hoja desde Google Sheets y actualiza el JSON temporal.
 * Lanza error si ninguna URL responde con datos utilizables.
 */
export async function syncFromSheet(): Promise<CatalogSnapshot> {
  const urls = sheetUrls();
  if (urls.length === 0) throw new Error("SHEET_ID no está configurado en .env");

  let lastError = "sin respuesta";
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (catalogo-repuestos)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      const text = await response.text();
      if (text.trimStart().startsWith("<")) {
        lastError = "la hoja no es pública (Google devolvió HTML)";
        continue;
      }
      const rows = normalizeRows(parseCsv(text));
      if (rows.length === 0) {
        lastError = "la hoja llegó vacía";
        continue;
      }
      const snapshot: CatalogSnapshot = {
        rows,
        updatedAt: new Date().toISOString(),
        source: "sheet",
        count: rows.length,
      };
      writeSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`No se pudo leer Google Sheets: ${lastError}`);
}

/** Sincronización en curso: varias aperturas simultáneas comparten la misma descarga. */
let inFlight: Promise<CatalogSnapshot> | null = null;

/** Antirrebote: no volvemos a pedir la hoja si acabamos de hacerlo. */
const MIN_AGE_MS = 20_000;

function ageOf(snapshot: CatalogSnapshot): number {
  if (!snapshot.updatedAt) return Number.POSITIVE_INFINITY;
  const ts = new Date(snapshot.updatedAt).getTime();
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : Date.now() - ts;
}

/**
 * Snapshot para abrir la app: intenta traer los últimos datos de Google Sheets
 * y, si la red falla o la hoja no responde, devuelve la última copia guardada.
 * Nunca lanza error: entrar a la app jamás debe quedar bloqueado por la red.
 */
export async function getFreshSnapshot(): Promise<CatalogSnapshot & { synced: boolean }> {
  const current = readSnapshot();

  // Recién sincronizado: servimos lo que ya tenemos.
  if (ageOf(current) < MIN_AGE_MS) return { ...current, synced: true };

  inFlight ??= syncFromSheet().finally(() => {
    inFlight = null;
  });

  try {
    const snapshot = await inFlight;
    return { ...snapshot, synced: true };
  } catch (error) {
    console.warn("Sincronización al entrar falló, uso la copia guardada:", error);
    return { ...current, synced: false };
  }
}

/** Enlace de solo lectura a la hoja, para el pie de la app. */
export function sheetLink(): string {
  return SHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`
    : "";
}
