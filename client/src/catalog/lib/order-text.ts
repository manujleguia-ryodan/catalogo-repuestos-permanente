import type { Part } from "./offline-cache";
import type { QtyMap } from "./qty-store";

export interface OrderItem {
  row: Part;
  qty: number;
}

export interface Order {
  items: OrderItem[];
  /** Cantidad de repuestos distintos. */
  lineas: number;
  /** Suma de todas las unidades. */
  unidades: number;
}

/** Arma el pedido a partir del catálogo y las cantidades guardadas. */
export function buildOrder(rows: Part[], cantidades: QtyMap): Order {
  const items = rows
    .filter((row) => (cantidades[row.id] ?? 0) > 0)
    .map((row) => ({ row, qty: cantidades[row.id] as number }));
  return {
    items,
    lineas: items.length,
    unidades: items.reduce((total, item) => total + item.qty, 0),
  };
}

/**
 * Texto plano listo para pegar en WhatsApp.
 *
 * Formato único y cerrado: solo el N/P y la cantidad, una línea por repuesto.
 * NO se incluye SAP, marca, descripción ni equipo — el proveedor pide el
 * repuesto por número de parte y cualquier dato extra genera confusión.
 * Aplica igual a Caterpillar y a cualquier otra marca que se agregue después.
 *
 *   Solicitud de repuestos
 *
 *   N/P 251-7176 #1
 *   N/P 153-5720 #2
 *   N/P ABC-4587 #5
 *
 * El # es la cantidad, exactamente la que eligió el usuario.
 */
export function orderToText(order: Order): string {
  const lineas = order.items.map((item) => {
    // Si a una fila aún le falta el N/P, sale como "-" en vez de desaparecer:
    // así el hueco se ve en el mensaje y no se pide un repuesto de menos.
    const np = (item.row.np || "").trim() || "-";
    return `N/P ${np} #${item.qty}`;
  });
  return ["Solicitud de repuestos", "", ...lineas].join("\n").trim();
}

export interface SapClipboard {
  texto: string;
  /** Líneas que sí se copiaron. */
  copiados: number;
  /** Repuestos omitidos por no tener código SAP. */
  omitidos: number;
}

/** Fila mínima que SAP necesita para pegar un componente y su cantidad. */
export interface SapItem {
  sap: string;
  qty: number;
}

function itemsWithSap(items: SapItem[]): SapItem[] {
  return items.filter((item) => (item.sap || "").trim());
}

/** Números SAP, uno por línea, para pegar comenzando en la columna Componente. */
export function itemsToSapComponentsText(items: SapItem[]): SapClipboard {
  const conSap = itemsWithSap(items);
  return {
    texto: conSap.map((item) => item.sap.trim()).join("\n"),
    copiados: conSap.length,
    omitidos: items.length - conSap.length,
  };
}

/** Cantidades, una por línea, para pegar comenzando en la celda Ctd.nece seleccionada. */
export function itemsToSapQuantitiesText(items: SapItem[]): SapClipboard {
  const conSap = itemsWithSap(items);
  return {
    texto: conSap.map((item) => String(item.qty)).join("\n"),
    copiados: conSap.length,
    omitidos: items.length - conSap.length,
  };
}

/**
 * Texto para pegar en la tabla de componentes de SAP S/4HANA.
 *
 * Una línea por repuesto: código SAP, CUATRO tabulaciones y la cantidad. La
 * tabulación adicional salta la columna "UM"; así la cantidad llega a
 * "Ctd.nece" y no se pega como unidad de medida. Nada de N/P, descripción,
 * equipo, marca ni unidad.
 *
 *   3007141\t\t\t\t2
 *   3002920\t\t\t\t1
 *
 * Los repuestos sin código SAP se omiten a propósito: una línea con el SAP
 * vacío correría toda la tabla al pegarla. Se informan aparte para que nadie
 * dé por copiado algo que no salió.
 */
export function itemsToSapText(items: SapItem[]): SapClipboard {
  const conSap = itemsWithSap(items);
  return {
    // Una fila de cinco celdas: SAP | vacío | vacío | vacío | Ctd.nece.
    texto: conSap
      .map((item) => [item.sap.trim(), "", "", "", String(item.qty)].join("\t"))
      .join("\n"),
    copiados: conSap.length,
    omitidos: items.length - conSap.length,
  };
}

/** Convierte el pedido actual al formato SAP de Componentes / Ctd.nece. */
export function orderToSapText(order: Order): SapClipboard {
  return itemsToSapText(order.items.map((item) => ({ sap: item.row.sap, qty: item.qty })));
}

export function orderToSapComponentsText(order: Order): SapClipboard {
  return itemsToSapComponentsText(order.items.map((item) => ({ sap: item.row.sap, qty: item.qty })));
}

export function orderToSapQuantitiesText(order: Order): SapClipboard {
  return itemsToSapQuantitiesText(order.items.map((item) => ({ sap: item.row.sap, qty: item.qty })));
}
