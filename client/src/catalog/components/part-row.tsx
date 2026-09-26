import { useState } from "react";
import { Check, Copy, Minus, Plus } from "lucide-react";
import type { Part } from "../lib/offline-cache";
import { addQuantity, setQuantity, useQuantity } from "../lib/qty-store";

/** Resalta el tramo que coincide con la búsqueda. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-amber/25 text-amber">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

/** Ícono de copiado propio de cada dato (N/P o SAP). */
function CopyIcon({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // sin permisos de portapapeles: no bloqueamos la app
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${label}`}
      title={`Copiar ${label}`}
      className={`grid size-8 shrink-0 place-items-center border transition-colors active:scale-95 ${
        copied
          ? "border-ok/60 text-ok"
          : "border-line text-muted hover:border-amber/50 hover:text-amber"
      }`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Selector de cantidad apartada: [ − ] 0 [ + ]. Se guarda en el dispositivo. */
export function QtyPicker({ id, size = "md" }: { id: string; size?: "md" | "sm" }) {
  const qty = useQuantity(id);
  const active = qty > 0;
  const box = size === "sm" ? "size-8" : "size-10";
  const field = size === "sm" ? "h-8 w-9 text-sm" : "h-10 w-11 text-base";

  return (
    <div
      className={`flex items-center border transition-colors ${
        active ? "border-amber bg-amber/10" : "border-line bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={() => addQuantity(id, -1)}
        disabled={!active}
        aria-label="Quitar una unidad"
        className={`grid ${box} place-items-center text-muted transition-colors active:scale-95 disabled:opacity-30 hover:text-amber`}
      >
        <Minus className="size-3.5" />
      </button>
      <input
        value={qty === 0 ? "" : String(qty)}
        onChange={(event) => setQuantity(id, Number(event.target.value.replace(/\D/g, "")))}
        inputMode="numeric"
        placeholder="0"
        aria-label="Cantidad requerida"
        className={`num ${field} border-x border-line bg-transparent text-center font-semibold focus:outline-none ${
          active ? "text-amber" : "text-muted/70"
        }`}
      />
      <button
        type="button"
        onClick={() => addQuantity(id, 1)}
        aria-label="Agregar una unidad"
        className={`grid ${box} place-items-center text-muted transition-colors active:scale-95 hover:text-amber`}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function PartRow({
  part,
  term,
  index,
  onOpen,
}: {
  part: Part;
  term: string;
  index: number;
  onOpen: (part: Part) => void;
}) {
  const qty = useQuantity(part.id);

  return (
    <li
      className={`rise flex items-center gap-3 border-b border-line/70 px-3 py-2.5 transition-colors hover:bg-surface/60 ${
        qty > 0 ? "border-l-2 border-l-amber bg-amber/[0.04]" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
    >
      {/* Columna izquierda: toda la información del repuesto */}
      <div className="min-w-0 flex-1">
        <span className="font-display text-[11px] leading-none font-semibold tracking-widest text-amber">
          {part.equipo || "—"}
        </span>

        <button
          type="button"
          onClick={() => onOpen(part)}
          aria-label={`Ver detalle de ${part.descripcion || "repuesto"}`}
          className="mt-0.5 block w-full text-left text-sm leading-snug text-text underline decoration-line decoration-dotted underline-offset-4 transition-colors hover:text-amber hover:decoration-amber/60"
        >
          <Highlight text={part.descripcion || "Sin descripción"} term={term} />
        </button>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="label-xs shrink-0">N/P</span>
            <span className="num truncate text-sm leading-none font-semibold text-text">
              <Highlight text={part.np || "—"} term={term} />
            </span>
            <CopyIcon value={part.np} label="N/P" />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="label-xs shrink-0">SAP</span>
            <span className="num truncate text-sm leading-none font-semibold text-text">
              <Highlight text={part.sap || "—"} term={term} />
            </span>
            <CopyIcon value={part.sap} label="SAP" />
          </div>
        </div>
      </div>

      {/* Columna derecha: selector de cantidad, centrado verticalmente */}
      <div className="shrink-0 self-center">
        <QtyPicker id={part.id} />
      </div>
    </li>
  );
}
