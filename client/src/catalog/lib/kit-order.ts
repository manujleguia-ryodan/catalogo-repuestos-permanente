import type { Part } from "./offline-cache";
import type { Order } from "./order-text";
import { setQuantity } from "./qty-store";
import { mergeKitItems, normalizeNp, type Kit, type KitItem } from "./kit-store";

/**
 * Puente entre los kits y la lista de pedido.
 *
 * La lista de pedido sigue siendo la de siempre (`qty-store`): aquí solo se
 * traduce de N/P guardado en el kit a la fila actual del catálogo y se usa
 * `setQuantity`, la misma función que usan los selectores [ − ] 0 [ + ].
 */

/** Convierte la lista de pedido actual en los repuestos de un kit. */
export function orderToKitItems(order: Order): KitItem[] {
  return mergeKitItems(
    order.items.map((item) => ({
      np: item.row.np,
      sap: item.row.sap,
      descripcion: item.row.descripcion,
      equipo: item.row.equipo,
      qty: item.qty,
    })),
  );
}

/** Equipo que más se repite en el pedido, para proponerlo al crear el kit. */
export function dominantEquipo(order: Order): string {
  const conteo = new Map<string, number>();
  for (const item of order.items) {
    const equipo = item.row.equipo?.trim();
    if (!equipo || equipo === "TODOS") continue;
    conteo.set(equipo, (conteo.get(equipo) ?? 0) + 1);
  }
  let mejor = "";
  let mejorConteo = 0;
  conteo.forEach((veces, equipo) => {
    if (veces > mejorConteo) {
      mejor = equipo;
      mejorConteo = veces;
    }
  });
  return mejor;
}

/** Fila del catálogo que corresponde a un N/P guardado en un kit. */
export function findRowByNp(rows: Part[], np: string): Part | undefined {
  const objetivo = normalizeNp(np);
  if (!objetivo) return undefined;
  return rows.find((row) => normalizeNp(row.np) === objetivo);
}

export interface ApplyKitResult {
  /** Repuestos del kit que se pusieron en la lista. */
  aplicados: number;
  /** N/P del kit que ya no están en el catálogo. */
  faltantes: string[];
}

/**
 * Carga un kit en la lista de pedido.
 *
 * FIJA la cantidad del kit en cada repuesto (no la suma a la que ya hubiera):
 * así pulsar dos veces "Agregar a lista de pedido" da exactamente el mismo
 * resultado y nunca aparece un pedido inflado sin que nadie lo haya tocado.
 */
export function applyKitToOrder(kit: Kit, rows: Part[]): ApplyKitResult {
  let aplicados = 0;
  const faltantes: string[] = [];
  for (const item of kit.items) {
    const row = findRowByNp(rows, item.np);
    if (!row) {
      faltantes.push(item.np);
      continue;
    }
    setQuantity(row.id, item.qty);
    aplicados += 1;
  }
  return { aplicados, faltantes };
}
