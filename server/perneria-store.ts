import { parseCsv } from "./csv";

export type PerneriaType = "PERNO" | "TUERCA" | "ARANDELA" | string;

export interface PerneriaRow {
  id: string;
  tipo: PerneriaType;
  medida: string;
  largoMm: number | null;
  acabado: string;
  np: string;
  descripcion: string;
}

export interface PerneriaSnapshot {
  rows: PerneriaRow[];
  updatedAt: string | null;
  source: "sheet" | "empty";
  count: number;
  synced: boolean;
  error: string | null;
  sheetUrl: string;
}

const SHEET_ID = process.env.SHEET_ID ?? "19b_CZw2cJM27ltJlV2b-f73m7TZ-Vth0";
const PERNERIA_GID = process.env.PERNERIA_SHEET_GID ?? "1688745544";

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function headerKey(value: string): string {
  return clean(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function parseLength(value: string): number | null {
  const normalized = clean(value).replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function normalizeRows(raw: string[][]): PerneriaRow[] {
  const [header, ...body] = raw;
  if (!header) return [];
  const keys = header.map(headerKey);
  const index = (matches: string[]) => keys.findIndex((key) => matches.some((match) => key === match || key.includes(match)));
  const columns = {
    id: index(["ID"]),
    tipo: index(["TIPO"]),
    medida: index(["MEDIDA"]),
    largo: index(["LARGOMM", "LARGO"]),
    acabado: index(["ACABADO"]),
    np: index(["NP", "NUMEROPARTE"]),
    descripcion: index(["DESCRIPCION", "DESCRIPCIONREPUESTO"]),
  };
  if ([columns.tipo, columns.medida, columns.acabado, columns.np].some((column) => column < 0)) return [];
  const at = (cells: string[], column: number) => (column >= 0 ? cells[column] ?? "" : "");
  return body.flatMap((cells, rowIndex) => {
    const tipo = clean(at(cells, columns.tipo)).toUpperCase();
    const medida = clean(at(cells, columns.medida)).toUpperCase();
    const acabado = clean(at(cells, columns.acabado)).toUpperCase();
    const np = clean(at(cells, columns.np)).replace(/\s+/g, "").toUpperCase();
    if (!tipo || !medida || !acabado || !np) return [];
    return [{
      id: clean(at(cells, columns.id)) || `${tipo}|${medida}|${acabado}|${np}|${rowIndex}`,
      tipo,
      medida,
      largoMm: parseLength(at(cells, columns.largo)),
      acabado,
      np,
      descripcion: clean(at(cells, columns.descripcion)),
    }];
  });
}

export function parsePerneriaCsv(text: string): PerneriaRow[] {
  return normalizeRows(parseCsv(text));
}

export function perneriaSheetUrl(): string {
  return SHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${PERNERIA_GID}#gid=${PERNERIA_GID}`
    : "";
}

export async function readPerneriaSheet(): Promise<PerneriaSnapshot> {
  const empty = (error: string | null): PerneriaSnapshot => ({
    rows: [],
    updatedAt: null,
    source: "empty",
    count: 0,
    synced: error === null,
    error,
    sheetUrl: perneriaSheetUrl(),
  });
  if (!SHEET_ID) return empty("SHEET_ID no está configurado");

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PERNERIA_GID}`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (catalogo-repuestos)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return empty(`Google Sheets respondió HTTP ${response.status}`);
    const text = await response.text();
    if (text.trimStart().startsWith("<")) return empty("La hoja PERNERIA no es pública");
    const rows = parsePerneriaCsv(text);
    return { rows, updatedAt: new Date().toISOString(), source: rows.length ? "sheet" : "empty", count: rows.length, synced: true, error: null, sheetUrl: perneriaSheetUrl() };
  } catch (error) {
    return empty(error instanceof Error ? error.message : "No se pudo leer PERNERIA");
  }
}
