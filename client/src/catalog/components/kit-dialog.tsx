import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Package, X } from "lucide-react";
import type { Part } from "../lib/offline-cache";
import type { Order } from "../lib/order-text";
import { createKit, kitFingerprint, nextKitCode, validateKit, type Kit } from "../lib/kit-store";
import { applyKitToOrder, dominantEquipo, orderToKitItems } from "../lib/kit-order";
import { recordUsage } from "../lib/usage-store";
import { clearQuantities, getQuantities, restoreQuantities, type QtyMap } from "../lib/qty-store";

interface KitDialogProps {
  open: boolean;
  order: Order;
  rows: Part[];
  /** Equipos del catálogo, para elegir el del kit. */
  equipos: string[];
  onClose: () => void;
}

/**
 * Crear kit a partir de la lista de pedido actual.
 *
 * Antes de guardar comprueba la huella EQUIPO + N/P + cantidades: si ese mismo
 * conjunto ya existe no crea un segundo kit, ofrece usar el que ya está.
 */
export function KitDialog({ open, order, rows, equipos, onClose }: KitDialogProps) {
  const [trabajo, setTrabajo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [duplicado, setDuplicado] = useState<Kit | null>(null);
  const [creado, setCreado] = useState<Kit | null>(null);
  /** Cantidades de antes de guardar, por si el usuario quiere recuperarlas. */
  const [previo, setPrevio] = useState<QtyMap | null>(null);

  const items = useMemo(() => orderToKitItems(order), [order]);

  // Al abrir: proponemos el equipo que más se repite en el pedido.
  useEffect(() => {
    if (!open) return;
    setTrabajo("");
    setEquipo(dominantEquipo(order));
    setDuplicado(null);
    setCreado(null);
    setPrevio(null);
    // Solo al abrir: escribir en el formulario no debe reiniciarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Si cambia el conjunto de repuestos, el aviso de duplicado deja de valer.
  const huella = kitFingerprint(equipo, items);
  useEffect(() => {
    setDuplicado(null);
  }, [huella]);

  if (!open) return null;

  const errores = validateKit({ trabajo, equipo, items });
  const valido = errores.length === 0;
  const unidades = items.reduce((total, item) => total + item.qty, 0);
  const opciones = equipos.filter((item) => item !== "TODOS LOS EQUIPOS" && item !== "TODOS");

  const guardar = () => {
    const resultado = createKit({ trabajo, equipo, items });
    if (resultado.ok) {
      recordUsage(items.map((item) => item.np));
      // El kit ya guarda los repuestos: la lista de pedido queda en 0
      // para no tener que borrarlos uno por uno.
      setPrevio(getQuantities());
      clearQuantities();
      setCreado(resultado.kit);
      setDuplicado(null);
      return;
    }
    if (resultado.motivo === "duplicado") setDuplicado(resultado.kit);
  };

  const usarExistente = () => {
    if (!duplicado) return;
    applyKitToOrder(duplicado, rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar creación de kit"
        onClick={onClose}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <dialog
        open
        aria-modal="true"
        aria-label="Crear kit"
        className="relative m-0 flex max-h-[86dvh] w-full max-w-[440px] flex-col border border-amber/40 bg-ink"
      >
        <div className="flex items-start gap-2 border-b border-line px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="font-display text-[10px] leading-none font-bold tracking-widest text-amber uppercase">
              Nuevo kit
            </span>
            <h2 className="mt-1 text-sm leading-snug font-semibold text-text">
              Guardar estos {items.length} repuestos como kit
            </h2>
            <p className="num mt-1 text-[11px] text-muted">{unidades} unidades en total</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-amber/50 hover:text-amber"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {creado ? (
            <div className="py-6 text-center">
              <Check className="mx-auto size-8 text-ok" />
              <p className="mt-3 font-display text-lg font-bold tracking-wide uppercase">
                Kit guardado
              </p>
              <p className="num mt-2 border border-amber/40 bg-amber/10 px-3 py-2 font-display text-base font-bold tracking-widest text-amber">
                {creado.codigo}
              </p>
              <p className="mt-2 text-sm text-muted">{creado.trabajo}</p>
              <p className="mt-4 text-xs text-muted">
                La lista de pedido quedó en 0.
                {previo && (
                  <button
                    type="button"
                    onClick={() => {
                      restoreQuantities(previo);
                      setPrevio(null);
                      onClose();
                    }}
                    className="ml-1 text-amber underline underline-offset-4"
                  >
                    Recuperar los repuestos
                  </button>
                )}
              </p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="label-xs">Nombre del trabajo</span>
                <input
                  value={trabajo}
                  onChange={(event) => setTrabajo(event.target.value)}
                  aria-label="Nombre del trabajo"
                  placeholder="Cambio de cuchillas y cantoneras"
                  maxLength={80}
                  className="mt-1 h-12 w-full border border-line bg-surface px-3 text-base text-text placeholder:text-muted/60 focus:border-amber/60 focus:outline-none"
                />
              </label>

              <label className="mt-3 block">
                <span className="label-xs">Equipo</span>
                <select
                  value={equipo}
                  onChange={(event) => setEquipo(event.target.value)}
                  className="num mt-1 h-12 w-full border border-line bg-surface px-3 text-base text-text focus:border-amber/60 focus:outline-none"
                >
                  <option value="">Elegir equipo…</option>
                  {opciones.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {equipo && !duplicado && (
                <p className="num mt-2 text-[11px] text-muted">
                  Código que recibirá: <span className="text-amber">{nextKitCode(equipo)}</span>
                </p>
              )}

              <ul className="mt-3 border border-line">
                {items.map((item) => (
                  <li
                    key={item.np}
                    className="flex items-center gap-2 border-b border-line/70 px-2.5 py-1.5 last:border-b-0"
                  >
                    <span className="num min-w-0 flex-1 truncate text-xs text-text">
                      {item.np || "SIN N/P"}
                      <span className="text-muted"> · {item.descripcion || "sin descripción"}</span>
                    </span>
                    <span className="num shrink-0 text-xs font-bold text-amber">×{item.qty}</span>
                  </li>
                ))}
              </ul>

              {errores.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {errores.map((error) => (
                    <li key={error} className="flex items-start gap-1.5 text-[11px] text-warn">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {error}
                    </li>
                  ))}
                </ul>
              )}

              {duplicado && (
                <div className="mt-3 border border-amber/40 bg-amber/10 px-3 py-2.5">
                  <p className="flex items-start gap-1.5 text-sm text-text">
                    <Package className="mt-0.5 size-4 shrink-0 text-amber" />
                    <span>
                      Este conjunto de repuestos ya existe en el Kit{" "}
                      <span className="font-semibold text-amber">
                        {duplicado.trabajo || duplicado.codigo}
                      </span>{" "}
                      <span className="num text-muted">({duplicado.codigo})</span>.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={usarExistente}
                    className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 border border-amber font-display text-sm font-bold tracking-widest text-amber uppercase transition-transform active:scale-[0.98]"
                  >
                    Usar kit existente
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-line px-3 pt-3 pb-6">
          {creado ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center gap-2 bg-amber font-display text-sm font-bold tracking-widest text-ink uppercase transition-transform active:scale-[0.98]"
            >
              Listo
            </button>
          ) : (
            <button
              type="button"
              onClick={guardar}
              disabled={!valido || duplicado !== null}
              className="flex h-12 w-full items-center justify-center gap-2 bg-amber font-display text-sm font-bold tracking-widest text-ink uppercase transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
            >
              <Package className="size-4" /> Guardar kit
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}
