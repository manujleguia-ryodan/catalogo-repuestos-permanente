import type { Part } from "./offline-cache";

/**
 * Pedido en curso: se guarda en el dispositivo, así la lista sobrevive
 * a recargas, a quedarse sin señal y a que la hoja se actualice.
 * Guardamos una copia de los datos del repuesto para que un ítem del pedido
 * siga legible aunque la fila cambie o desaparezca del catálogo.
 */
export interface OrderItem {
  id: string;
  equipo: string;
  np: string;
  descripcion: string;
  sap: string;
  qty: number;
  /** ISO de cuándo se agregó, para ordenar el pedido. */
  addedAt: string;
}

export type Order = Record<string, OrderItem>;

const ORDER_KEY = "catalogo.pedido.v1";
const MAX_QTY = 9999;

function read(): Order {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Order;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function write(order: Order): void {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // cuota llena o modo privado: seguimos con el pedido en memoria
  }
}

let current: Order | null = null;
const listeners = new Set<() => void>();

function emit(next: Order): void {
  current = next;
  write(next);
  listeners.forEach((listener) => listener());
}

export function subscribeOrder(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOrder(): Order {
  if (current === null) current = read();
  return current;
}

/** Cantidad requerida de un repuesto (0 = no está en el pedido). */
export function getQty(id: string): number {
  return getOrder()[id]?.qty ?? 0;
}

export function clampQty(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_QTY, Math.max(0, Math.trunc(value)));
}

/** Fija la cantidad requerida. Con 0 el repuesto sale del pedido. */
export function setQty(part: Part, value: number): void {
  const qty = clampQty(value);
  const order = getOrder();
  if (qty === 0) {
    if (!order[part.id]) return;
    const next = { ...order };
    delete next[part.id];
    emit(next);
    return;
  }
  const previous = order[part.id];
  emit({
    ...order,
    [part.id]: {
      id: part.id,
      equipo: part.equipo,
      np: part.np,
      descripcion: part.descripcion,
      sap: part.sap,
      qty,
      addedAt: previous?.addedAt ?? new Date().toISOString(),
    },
  });
}

export function removeFromOrder(id: string): void {
  const order = getOrder();
  if (!order[id]) return;
  const next = { ...order };
  delete next[id];
  emit(next);
}

export function clearOrder(): void {
  emit({});
}

/** Ítems del pedido en el orden en que se agregaron. */
export function orderItems(order: Order): OrderItem[] {
  return Object.values(order).sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export function orderTotals(order: Order): { items: number; units: number } {
  const items = orderItems(order);
  return {
    items: items.length,
    units: items.reduce((sum, item) => sum + item.qty, 0),
  };
}

function stamp(): string {
  return new Date().toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Texto plano listo para WhatsApp o para copiar y pegar. */
export function orderToText(order: Order): string {
  const items = orderItems(order);
  const totals = orderTotals(order);
  const lines = [
    "*PEDIDO DE REPUESTOS*",
    stamp(),
    "",
    ...items.map(
      (item, index) =>
        `${index + 1}. ${item.qty} x ${item.np}${item.sap ? ` (SAP ${item.sap})` : ""}\n` +
        `   ${item.descripcion}${item.equipo ? ` — ${item.equipo}` : ""}`,
    ),
    "",
    `Total: ${totals.items} ítems · ${totals.units} unidades`,
  ];
  return lines.join("\n");
}

/** CSV con separador ; para que Excel en español lo abra en columnas. */
export function orderToCsv(order: Order): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["CANTIDAD", "N/P", "SAP", "DESCRIPCION", "EQUIPO"],
    ...orderItems(order).map((item) => [
      String(item.qty),
      item.np,
      item.sap,
      item.descripcion,
      item.equipo,
    ]),
  ];
  return rows.map((row) => row.map(escape).join(";")).join("\r\n");
}
