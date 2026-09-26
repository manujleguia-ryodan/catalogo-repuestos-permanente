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
    <div className="panel flex flex-col overflow-hidden rounded-lg transition duration-150 ease-out hover:-translate-y-0.5 hover:border-amber/50 hover:shadow-lg hover:shadow-black/20 motion-reduce:transform-none">
      <button
        type="button"
        onClick={() => onOpen(kit)}
        aria-label={`Abrir kit ${kit.codigo}`}
        className="group flex-1 px-4 pt-4 pb-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Package className="size-3.5 shrink-0 text-amber" />
          <span className="num font-display text-[11px] leading-none font-bold tracking-widest text-amber transition-colors group-hover:text-amber/80">
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
        <p className="mt-1 text-[10px] font-display tracking-widest text-muted">
          {kit.origen === "compartido" ? "Compartido" : "Este dispositivo"}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onAdd(kit)}
        className="flex h-11 items-center justify-center gap-1.5 border-t border-line font-display text-[11px] font-bold tracking-wide text-muted transition-colors active:scale-[0.98] hover:bg-amber hover:text-ink"
      >
        <Plus className="size-3.5" /> Agregar a lista de pedido
      </button>
    </div>
  );
}
