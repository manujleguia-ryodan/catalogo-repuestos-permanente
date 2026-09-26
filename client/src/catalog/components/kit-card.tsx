import { Cloud, Package, Plus } from "lucide-react";
import { kitUnits, type Kit } from "../lib/kit-store";

/** Tarjeta de kit: código, trabajo, equipo, cuántos tipos de repuesto lleva. */
export function KitCard({
  kit,
  onOpen,
  onAdd,
}: {
  kit: Kit;
  onOpen: (kit: Kit) => void;
  onAdd: (kit: Kit) => void;
}) {
  return (
    <div className="flex flex-col border border-line bg-surface transition-colors hover:border-amber/40">
      <button
        type="button"
        onClick={() => onOpen(kit)}
        aria-label={`Abrir kit ${kit.codigo}`}
        className="flex-1 px-3 pt-3 pb-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Package className="size-3.5 shrink-0 text-amber" />
          <span className="num font-display text-[11px] leading-none font-bold tracking-widest text-amber uppercase">
            {kit.codigo}
          </span>
          {kit.origen === "compartido" && <Cloud className="size-3 text-ok" aria-label="Kit compartido" />}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-text">
          {kit.trabajo || "Sin nombre"}
        </p>
        <p className="num mt-1.5 text-[11px] text-muted">
          {kit.equipo || "—"} · {kit.items.length}{" "}
          {kit.items.length === 1 ? "repuesto" : "repuestos"} · {kitUnits(kit)} u
        </p>
        <p className="mt-1 text-[10px] font-display tracking-widest text-muted uppercase">
          {kit.origen === "compartido" ? "Compartido" : "Este dispositivo"}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onAdd(kit)}
        className="flex h-10 items-center justify-center gap-1.5 border-t border-line font-display text-[11px] font-bold tracking-widest text-muted uppercase transition-colors active:scale-[0.98] hover:bg-amber hover:text-ink"
      >
        <Plus className="size-3.5" /> Agregar a lista de pedido
      </button>
    </div>
  );
}
