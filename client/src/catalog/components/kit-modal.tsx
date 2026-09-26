import { useEffect, useState } from "react";
import { AlertTriangle, Check, Cloud, Pencil, Plus, Table2, Trash2, X } from "lucide-react";
import type { Part } from "../lib/offline-cache";
import { deleteKit, kitUnits, type Kit } from "../lib/kit-store";
import { applyKitToOrder, findRowByNp } from "../lib/kit-order";
import { itemsToSapText } from "../lib/order-text";
import { recordUsage } from "../lib/usage-store";
import { KitEditDialog } from "./kit-edit-dialog";
import { useSharedKitActions } from "../queries/shared-kits";

function fecha(iso: string): string {
  const valor = new Date(iso);
  if (Number.isNaN(valor.getTime())) return "—";
  return valor.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

/** Ficha del kit: qué lleva y acción para cargarlo en la lista de pedido. */
export function KitModal({
  kit,
  rows,
  equipos,
  onClose,
  onNotice,
}: {
  kit: Kit | null;
  rows: Part[];
  equipos: string[];
  onClose: () => void;
  onNotice?: (message: string) => void;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [editar, setEditar] = useState(false);
  const sharedActions = useSharedKitActions();

  useEffect(() => {
    setAviso(null);
    setConfirmar(false);
    setEditar(false);
  }, [kit?.id]);

  useEffect(() => {
    if (!kit) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [kit, onClose]);

  if (!kit) return null;

  const agregar = () => {
    const { aplicados, faltantes } = applyKitToOrder(kit, rows);
    setAviso(
      faltantes.length === 0
        ? `${aplicados} repuestos cargados en la lista de pedido.`
        : `${aplicados} cargados. Sin coincidencia en el catálogo: ${faltantes.join(", ")}.`,
    );
  };

  /** Copia SAP y cantidad en la misma fila: SAP | vacío | Ctd.nece. */
  const copiarSap = async () => {
    const { texto, copiados, omitidos } = itemsToSapText(kit.items);
    if (copiados === 0) {
      setAviso("Ningún repuesto de este kit tiene código SAP.");
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Sin permisos de portapapeles: no bloqueamos la app.
    }
    setAviso(
      omitidos > 0
        ? `Copiado para SAP: pega desde Componente; la cantidad irá en el segundo tab. ${omitidos} sin SAP quedaron fuera.`
        : "Copiado para SAP: pega desde Componente; la cantidad irá en el segundo tab.",
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar kit"
        onClick={onClose}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <dialog
        open
        aria-modal="true"
        aria-label={`Kit ${kit.codigo}`}
        className="relative m-0 flex max-h-[86dvh] w-full max-w-[480px] flex-col border border-amber/40 bg-ink"
      >
          <div className="flex items-start gap-2 border-b border-line px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="num font-display text-[10px] leading-none font-bold tracking-widest text-amber">
              {kit.codigo}
            </span>
            <h2 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-text">
              {kit.trabajo || "Sin nombre"}
            </h2>
            <p className="num mt-1 text-[11px] text-muted">
              {kit.equipo || "—"} · {kit.items.length} repuestos · {kitUnits(kit)} u · creado{" "}
              {fecha(kit.creadoEn)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-display tracking-widest text-muted">
              {kit.origen === "compartido" && <Cloud className="size-3 text-ok" />}
              {kit.origen === "compartido" ? "Compartido" : "Este dispositivo"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana del kit"
            className="grid size-9 shrink-0 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-amber/50 hover:text-amber"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain">
          {kit.items.map((item) => {
            const enCatalogo = findRowByNp(rows, item.np);
            return (
              <li key={item.np} className="flex items-start gap-3 border-b border-line/70 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-text">
                    {item.descripcion || "Sin descripción"}
                  </p>
                  <p className="num mt-1 text-xs text-muted">
                    N/P {item.np} · SAP {item.sap || "—"}
                  </p>
                  {!enCatalogo && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-warn">
                      <AlertTriangle className="size-3" /> ya no está en el catálogo
                    </p>
                  )}
                </div>
                <span className="num shrink-0 border border-line px-2.5 py-1 text-sm font-bold text-amber">
                  ×{item.qty}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line px-3 pt-3 pb-6">
          {aviso && (
            <p className="mb-2 flex items-start gap-1.5 text-xs text-ok">
              <Check className="mt-0.5 size-3.5 shrink-0" /> {aviso}
            </p>
          )}
          <p className="mb-2 text-[11px] text-muted">
            Al cargarlo, cada repuesto queda con la cantidad del kit. Puedes cambiarlas antes de
            generar el pedido.
          </p>
          <div className="flex items-center gap-2">
            <div className="grid flex-1 grid-cols-2 gap-2">
              <button
                type="button"
                onClick={agregar}
                className="flex h-12 items-center justify-center gap-2 bg-amber px-2 font-display text-xs font-bold tracking-widest text-ink transition-transform active:scale-[0.98]"
              >
                <Plus className="size-4" /> A pedido
              </button>
              <button
                type="button"
                onClick={() => setEditar(true)}
                className="flex h-12 items-center justify-center gap-2 border border-line px-2 font-display text-xs font-bold tracking-widest text-text transition-colors active:scale-[0.98] hover:border-amber/60 hover:text-amber"
              >
                <Pencil className="size-4" /> Editar
              </button>
              <button
                type="button"
                onClick={copiarSap}
                className="flex h-12 items-center justify-center gap-2 border border-line px-2 font-display text-xs font-bold tracking-widest text-text transition-colors active:scale-[0.98] hover:border-amber/60 hover:text-amber"
              >
                <Table2 className="size-4" /> Copiar SAP
              </button>
            </div>
            {confirmar ? (
              <button
                type="button"
                onClick={async () => {
                  if (kit.origen === "compartido") await sharedActions.remove.mutateAsync(kit.id);
                  else deleteKit(kit.id);
                  onClose();
                }}
                className="flex h-12 shrink-0 items-center gap-2 border border-warn px-3 font-display text-sm font-bold tracking-widest text-warn transition-transform active:scale-[0.98]"
              >
                <Trash2 className="size-4" /> {sharedActions.remove.isPending ? "Borrando…" : "Borrar"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmar(true)}
                aria-label="Eliminar este kit"
                className="grid size-12 shrink-0 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-warn/60 hover:text-warn"
              >
                <Trash2 className="size-5" />
              </button>
            )}
          </div>
        </div>
      </dialog>
      <KitEditDialog
        kit={editar ? kit : null}
        rows={rows}
        equipos={equipos}
        onClose={() => setEditar(false)}
        onShared={(message) => { onNotice?.(message); setEditar(false); onClose(); }}
      />
    </div>
  );
}
