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

/**
 * Texto para pegar en la tabla de componentes de SAP S/4HANA.
 *
 * Una línea por repuesto: código SAP, TRES tabulaciones y la cantidad. Las tres
 * tabulaciones saltan las columnas Descripción y T... para que la cantidad
 * caiga en "Ctd.nec...". Nada de N/P, descripción, equipo, marca ni unidad.
 *
 *   3007141\t\t\t2
 *   3002920\t\t\t1
 *
 * Los repuestos sin código SAP se omiten a propósito: una línea con el SAP
 * vacío correría toda la tabla al pegarla. Se informan aparte para que nadie
 * dé por copiado algo que no salió.
 */
export function orderToSapText(order: Order): SapClipboard {
  const conSap = order.items.filter((item) => (item.row.sap || "").trim());
  return {
    texto: conSap.map((item) => `${item.row.sap.trim()}\t\t\t${item.qty}`).join("\n"),
    copiados: conSap.length,
    omitidos: order.items.length - conSap.length,
  };
}
