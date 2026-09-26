import { useEffect, useState } from "react";
import { Check, ImageOff, Minus, Plus, X } from "lucide-react";
import type { Part } from "../lib/offline-cache";
import { setQuantity, useQuantity } from "../lib/qty-store";

const MAX_QTY = 9999;

/** Dato suelto del detalle: etiqueta arriba, valor abajo. */
function Campo({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="label-xs">{label}</span>
      <p className={`mt-0.5 truncate text-sm font-semibold text-text ${mono ? "num" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

/**
 * Cuadro de la foto: mismas medidas siempre, haya imagen o no.
 *
 * Lo comparten la foto y el placeholder, así el encuadre no cambia de tamaño
 * ni salta cuando un repuesto no tiene imagen o el enlace falla.
 *
 * El tope de altura deja sitio a los datos y al selector de cantidad para que
 * la ficha entera quepa sin desplazar. Depende solo de la pantalla, nunca del
 * repuesto, así que el cuadro sigue midiendo igual en todas las fichas.
 */
const CAJA_FOTO =
  "mx-auto flex aspect-[4/3] max-h-[26dvh] w-full items-center justify-center overflow-hidden border border-line bg-surface";

/** Foto del repuesto. Si no hay enlace o falla la carga: "Imagen no disponible". */
function Foto({ src, alt }: { src: string; alt: string }) {
  const [fallo, setFallo] = useState(false);

  // Un repuesto distinto vuelve a intentar cargar su propia foto.
  useEffect(() => {
    setFallo(false);
  }, [src]);

  if (!src || fallo) {
    return (
      <div className={CAJA_FOTO}>
        <div className="flex flex-col items-center gap-2 text-muted">
          <ImageOff className="size-8" />
          <span className="font-display text-xs font-semibold tracking-widest">
            Imagen no disponible
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={CAJA_FOTO}>
      <img
        src={src}
        alt={alt}
        // Sin lazy: la ficha solo se abre bajo demanda, así que la foto se pide
        // ya. Con lazy el navegador puede considerarla fuera de viewport durante
        // la animación de apertura y dejarla sin cargar.
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFallo(true)}
        // h-full w-full + object-contain: la foto se ajusta al cuadro completo
        // sin recortarse ni deformarse; object-center deja el sobrante repartido
        // a los lados o arriba y abajo, según la proporción original.
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}

interface PartModalProps {
  part: Part | null;
  onClose: () => void;
}

/**
 * Detalle del repuesto: foto, datos y selector de cantidad.
 * La cantidad se elige aquí en borrador y solo entra a la lista al confirmar:
 * la cantidad sugerida por la hoja NUNCA se aparta sola.
 */
export function PartModal({ part, onClose }: PartModalProps) {
  const apartada = useQuantity(part?.id ?? "");
  const [cantidad, setCantidad] = useState(0);
  const [agregado, setAgregado] = useState(false);

  // Al abrir: partimos de lo ya apartado; si no hay nada, de lo sugerido en la hoja.
  useEffect(() => {
    if (!part) return;
    const inicial = apartada > 0 ? apartada : (part.cantidadRequerida ?? 0);
    setCantidad(inicial);
    setAgregado(false);
    // Solo al cambiar de repuesto: editar la cantidad no debe reiniciar el borrador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part?.id]);

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!part) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [part, onClose]);

  if (!part) return null;

  const ajustar = (delta: number) =>
    setCantidad((valor) => Math.max(0, Math.min(MAX_QTY, valor + delta)));

  const agregar = () => {
    if (cantidad <= 0) return;
    // setQuantity actualiza la línea existente: nunca duplica el repuesto.
    setQuantity(part.id, cantidad);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1800);
  };

  const sugerida = part.cantidadRequerida ?? 0;

  return (
    // Anclada arriba: la ficha se abre pegada al borde superior, no centrada
    // ni como hoja inferior, para leerla sin bajar la vista.
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar detalle"
        onClick={onClose}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <dialog
        open
        aria-modal="true"
        aria-label={`Detalle de ${part.descripcion || "repuesto"}`}
        // 20% más pequeña que antes: 520 -> 416 de ancho y 92dvh -> 74dvh de alto.
        className="relative m-0 flex max-h-[74dvh] w-full max-w-[416px] flex-col border border-amber/40 bg-ink"
      >
        <div className="flex items-start gap-2 border-b border-line px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="font-display text-[10px] leading-none font-semibold tracking-widest text-amber">
              {part.equipo || "—"}
            </span>
            <h2 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-text">
              {part.descripcion || "Sin descripción"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de detalle"
            className="grid size-9 shrink-0 place-items-center border border-line text-muted transition-colors active:scale-95 hover:border-amber/50 hover:text-amber"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sigue pudiendo desplazarse por seguridad en pantallas muy bajas,
            pero con la foto acotada el contenido cabe entero de una vez. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <Foto src={part.imagen ?? ""} alt={part.descripcion || "Repuesto"} />

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            <Campo label="N/P" value={part.np} mono />
            <Campo label="SAP" value={part.sap} mono />
            <Campo label="Equipo" value={part.equipo} />
            <div className="min-w-0">
              <span className="label-xs">Cantidad requerida</span>
              <p className="num mt-0.5 truncate text-sm font-semibold text-text">
                {sugerida > 0 ? sugerida : "Sin definir"}
              </p>
              {/* La hoja solo sugiere: nunca aparta sola. */}
              {sugerida > 0 && (
                <p className="mt-0.5 text-[11px] leading-tight text-muted">
                  Sugerida por la hoja, no se aparta sola
                </p>
              )}
            </div>
          </div>

          {apartada > 0 && (
            <p className="num mt-2 text-[11px] leading-tight text-amber">
              Ya tienes {apartada} en tu lista. Al agregar, se reemplaza por la cantidad elegida.
            </p>
          )}
        </div>

        <div className="border-t border-line px-3 pt-2 pb-3">
          {agregado && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-ok">
              <Check className="size-3.5" /> Repuesto agregado a mi lista
            </p>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-line bg-surface">
              <button
                type="button"
                onClick={() => ajustar(-1)}
                disabled={cantidad <= 0}
                aria-label="Restar una unidad en el detalle"
                className="grid size-11 place-items-center text-muted transition-colors active:scale-95 disabled:opacity-30 hover:text-amber"
              >
                <Minus className="size-4" />
              </button>
              <input
                value={cantidad === 0 ? "" : String(cantidad)}
                onChange={(event) =>
                  setCantidad(
                    Math.min(MAX_QTY, Number(event.target.value.replace(/\D/g, "")) || 0),
                  )
                }
                inputMode="numeric"
                placeholder="0"
                aria-label="Cantidad a agregar"
                className={`num h-11 w-12 border-x border-line bg-transparent text-center text-base font-semibold focus:outline-none ${
                  cantidad > 0 ? "text-amber" : "text-muted/70"
                }`}
              />
              <button
                type="button"
                onClick={() => ajustar(1)}
                aria-label="Sumar una unidad en el detalle"
                className="grid size-11 place-items-center text-muted transition-colors active:scale-95 hover:text-amber"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={agregar}
              disabled={cantidad <= 0}
              className="h-11 flex-1 bg-amber font-display text-sm font-bold tracking-widest text-ink transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              Agregar a mi lista
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
