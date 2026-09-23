import { useEffect, useState } from "react";
import { Check, ClipboardList, Copy, Package, RotateCcw, Table2, Trash2, X } from "lucide-react";
import { QtyPicker } from "./part-row";
import { KitDialog } from "./kit-dialog";
import {
  clearQuantities,
  getQuantities,
  removeQuantity,
  restoreQuantities,
  type QtyMap,
} from "../lib/qty-store";
import { orderToSapText, orderToText, type Order } from "../lib/order-text";
import { recordUsage } from "../lib/usage-store";
import type { Part } from "../lib/offline-cache";

interface OrderSheetProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  /** Catálogo actual: necesario para cargar un kit existente en la lista. */
  rows: Part[];
  /** Equipos del catálogo, para elegir el del kit. */
  equipos: string[];
}

/** Panel emergente: revisar, editar o eliminar los repuestos apartados. */
export function OrderSheet({ order, open, onClose, rows, equipos }: OrderSheetProps) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [crearKit, setCrearKit] = useState(false);
  /** Pedido ya copiado: la lista queda en 0 y se puede deshacer. */
  const [hecho, setHecho] = useState<{ texto: string; previo: QtyMap } | null>(null);

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // Con el diálogo de kit encima, Escape cierra solo ese diálogo.
      if (event.key === "Escape" && !crearKit) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, crearKit]);

  useEffect(() => {
    if (!open) {
      setConfirmar(false);
      setCrearKit(false);
      setAviso(null);
      setHecho(null);
    }
  }, [open]);

  // Si se vacía la lista desde dentro, el panel se cierra solo.
  // Mientras se crea un kit o se muestra el resumen de "copiado", no.
  useEffect(() => {
    if (open && order.items.length === 0 && !crearKit && !hecho) onClose();
  }, [open, order.items.length, crearKit, hecho, onClose]);

  if (!open) return null;

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 3500);
  };

  /** Tras copiar, la lista queda en 0 sin tener que borrar repuesto por repuesto. */
  const vaciarTrasCopiar = (texto: string) => {
    const previo = getQuantities();
    clearQuantities();
    setHecho({ texto, previo });
  };

  const deshacer = () => {
    if (hecho) restoreQuantities(hecho.previo);
    setHecho(null);
  };

  /** WhatsApp: solo N/P y cantidad. */
  const copiar = async () => {
    const texto = orderToText(order);
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // sin permisos de portapapeles: mostramos el texto para copiar a mano
    }
    recordUsage(order.items.map((item) => item.row.np));
    vaciarTrasCopiar("Lista copiada — pégala en WhatsApp o correo.");
  };

  /** SAP S/4HANA: código SAP + cuatro tabulaciones + cantidad en Ctd.nece. */
  const copiarSap = async () => {
    const { texto, copiados, omitidos } = orderToSapText(order);
    if (copiados === 0) {
      mostrarAviso("Ningún repuesto de la lista tiene código SAP.");
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // sin permisos de portapapeles: no bloqueamos la app
    }
    recordUsage(order.items.map((item) => item.row.np));
    vaciarTrasCopiar(
      omitidos > 0
        ? `¡Copiado para SAP! Pega con Ctrl+V en Componente: la cantidad irá a Ctd.nece. ${omitidos} sin código SAP quedaron fuera.`
        : "¡Copiado para SAP! Pega con Ctrl+V en Componente: la cantidad irá a Ctd.nece.",
    );
  };

  // Pantalla de "ya está": la lista quedó en 0 y todavía se puede recuperar.
  if (hecho) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <button
          type="button"
          aria-label="Cerrar resumen"
          onClick={onClose}
          className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        />
        <div className="relative w-full max-w-[780px] border-t border-amber/40 bg-ink px-4 pt-6 pb-8">
          <Check className="mx-auto size-8 text-ok" />
          <p className="mt-3 text-center text-sm text-text">{hecho.texto}</p>
          <p className="mt-2 text-center text-xs text-muted">
            Los repuestos quedaron en 0, listos para el siguiente pedido.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={deshacer}
              className="flex h-12 flex-1 items-center justify-center gap-2 border border-line font-display text-sm font-bold tracking-widest text-text uppercase transition-colors active:scale-[0.98] hover:border-amber/60 hover:text-amber"
            >
              <RotateCcw className="size-4" /> Deshacer
            </button>
            <button
              type="button"
              onClick={() => {
                setHecho(null);
                onClose();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 bg-amber font-display text-sm font-bold tracking-widest text-ink uppercase transition-transform active:scale-[0.98]"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <button
          type="button"
          aria-label="Cerrar resumen"
          onClick={onClose}
          className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        />

        <div className="relative flex max-h-[88dvh] w-full max-w-[780px] flex-col border-t border-amber/40 bg-ink">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
                Repuestos apartados
              </h2>
              <p className="num mt-1 text-xs text-muted">
                {order.lineas} repuestos · {order.unidades} unidades
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid size-10 shrink-0 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-amber/50 hover:text-amber"
            >
              <X className="size-4" />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto overscroll-contain">
            {order.items.map((item) => (
              <li key={item.row.id} className="border-b border-line/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-[11px] font-semibold tracking-widest text-amber uppercase">
                      {item.row.equipo || "—"}
                    </span>
                    <p className="mt-0.5 text-sm leading-snug text-text">
                      {item.row.descripcion || "Sin descripción"}
                    </p>
                    <p className="num mt-1 text-xs text-muted">
                      N/P {item.row.np || "—"} · SAP {item.row.sap || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <QtyPicker id={item.row.id} size="sm" />
                    <button
                      type="button"
                      onClick={() => removeQuantity(item.row.id)}
                      aria-label={`Eliminar ${item.row.np || item.row.sap} del pedido`}
                      className="grid size-8 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-warn/60 hover:text-warn"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-line px-4 pt-3 pb-8">
            {aviso && (
              <p className="mb-2 flex items-start gap-1.5 text-xs text-ok">
                <Check className="mt-0.5 size-3.5 shrink-0" /> {aviso}
              </p>
            )}

            {/* Fila 1: los dos destinos del pedido. */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copiar}
                className="flex h-12 flex-1 items-center justify-center gap-2 bg-amber font-display text-sm font-bold tracking-widest text-ink uppercase transition-transform active:scale-[0.98]"
              >
                <Copy className="size-4" /> Copiar lista
              </button>
              <button
                type="button"
                onClick={copiarSap}
                className="flex h-12 flex-1 items-center justify-center gap-2 border border-line font-display text-sm font-bold tracking-widest text-text uppercase transition-colors active:scale-[0.98] hover:border-amber/60 hover:text-amber"
              >
                <Table2 className="size-4" /> Copiar para SAP
              </button>
            </div>

            {/* Fila 2: guardar el pedido como kit y vaciar. */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCrearKit(true)}
                className="flex h-12 flex-1 items-center justify-center gap-2 border border-line font-display text-sm font-bold tracking-widest text-text uppercase transition-colors active:scale-[0.98] hover:border-amber/60 hover:text-amber"
              >
                <Package className="size-4" /> Crear kit
              </button>
              {confirmar ? (
                <button
                  type="button"
                  onClick={() => {
                    clearQuantities();
                    onClose();
                  }}
                  className="flex h-12 shrink-0 items-center gap-2 border border-warn px-4 font-display text-sm font-bold tracking-widest text-warn uppercase transition-transform active:scale-[0.98]"
                >
                  <Trash2 className="size-4" /> Confirmar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmar(true)}
                  aria-label="Vaciar la lista"
                  className="grid size-12 shrink-0 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-warn/60 hover:text-warn"
                >
                  <Trash2 className="size-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <KitDialog
        open={crearKit}
        order={order}
        rows={rows}
        equipos={equipos}
        onClose={() => setCrearKit(false)}
      />
    </>
  );
}

/** Botón flotante que abre el resumen. Solo aparece si hay algo apartado. */
export function OrderFab({ order, onOpen }: { order: Order; onOpen: () => void }) {
  if (order.items.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver resumen: ${order.lineas} repuestos, ${order.unidades} unidades`}
      className="fixed right-4 bottom-20 z-30 flex items-center gap-2.5 bg-amber px-4 py-3 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.97]"
    >
      <ClipboardList className="size-5 shrink-0" />
      <span className="text-left">
        <span className="block font-display text-[11px] leading-none font-bold tracking-widest uppercase">
          Ver pedido
        </span>
        <span className="num block text-sm leading-tight font-bold">
          {order.lineas} · {order.unidades} u
        </span>
      </span>
    </button>
  );
}
