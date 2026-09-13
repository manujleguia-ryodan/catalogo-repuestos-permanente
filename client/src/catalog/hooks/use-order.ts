import { useSyncExternalStore } from "react";
import { getOrder, subscribeOrder, type Order } from "../lib/order-store";

const emptyOrder: Order = {};

/** Pedido en curso, sincronizado entre todas las pantallas de la app. */
export function useOrder(): Order {
  return useSyncExternalStore(subscribeOrder, getOrder, () => emptyOrder);
}
