import { Cloud, Package, Plus } from "lucide-react";
import { kitUnits, type Kit } from "../lib/kit-store";

/** Tarjeta de kit: código, trabajo, equipo, cuántos tipos de repuesto lleva. */
export function KitCard({
  kit,
  onOpen,
  onAdd,
  compact = false,
}: {
  kit: Kit;
  onOpen: (kit: Kit) => void;
  onAdd: (kit: Kit) => void;
  compact?: boolean;
}) {
  return (
    <div className={`panel flex flex-col overflow-hidden rounded-lg transition duration-150 ease-out hover:-translate-y-0.5 hover:border-amber/50 hover:shadow-lg hover:shadow-black/20 motion-reduce:transform-none ${compact ? "min-h-0" : ""}`}>
      <button
        type="button"
        onClick={() => onOpen(kit)}
        aria-label={`Abrir kit ${kit.codigo}`}
        className={`group flex-1 text-left ${compact ? "px-3 pt-3 pb-2" : "px-4 pt-4 pb-3"}`}
      >
        <div className="flex items-center gap-2">
          <Package className="size-3.5 shrink-0 text-amber" />
          <span className="num font-display text-[11px] leading-none font-bold tracking-widest text-amber transition-colors group-hover:text-amber/80">
            {kit.codigo}
          </span>
          {kit.origen === "compartido" && <Cloud className="size-3 text-ok" aria-label="Kit compartido" />}
        </div>
        <p className={`mt-1.5 line-clamp-2 leading-snug text-text ${compact ? "text-[13px] font-semibold" : "text-sm"}`}>
          {kit.trabajo || "Sin nombre"}
        </p>
        <p className={`num mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted ${compact ? "" : ""}`}>
          <span className={compact ? "rounded border border-amber/60 bg-amber/10 px-1.5 py-0.5 text-[12px] font-bold tracking-wide text-amber" : "font-semibold text-text"}>{kit.equipo || "—"}</span>
          <span>· {kit.items.length}{" "}
          {kit.items.length === 1 ? "repuesto" : "repuestos"} · {kitUnits(kit)} u
          </span>
        </p>
        <p className={`mt-1 font-display tracking-wide text-muted ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {kit.origen === "compartido" ? "Compartido" : "Este dispositivo"}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onAdd(kit)}
        className={`flex items-center justify-center gap-1.5 border-t border-line font-display text-[11px] font-bold tracking-wide text-muted transition-colors active:scale-[0.98] hover:bg-amber hover:text-ink ${compact ? "h-9" : "h-11"}`}
      >
        <Plus className="size-3.5" /> Agregar a lista de pedido
      </button>
    </div>
  );
}
