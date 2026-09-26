import { useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";
import type { Kit } from "../lib/kit-store";
import { KitCard } from "./kit-card";

/**
 * Pestaña "Kits de repuestos": todos los kits guardados, con filtro por equipo.
 */
export function KitList({
  kits,
  onOpenKit,
  onAddKit,
}: {
  kits: Kit[];
  onOpenKit: (kit: Kit) => void;
  onAddKit: (kit: Kit) => void;
}) {
  const [equipo, setEquipo] = useState("TODOS LOS EQUIPOS");
  const [busqueda, setBusqueda] = useState("");
  const [origen, setOrigen] = useState<"todos" | "compartido" | "local">("todos");

  const equipos = useMemo(() => {
    const set = new Set<string>();
    for (const kit of kits) if (kit.equipo) set.add(kit.equipo);
    return ["TODOS LOS EQUIPOS", ...Array.from(set).sort()];
  }, [kits]);

  const visibles = useMemo(() => {
    const needle = busqueda.trim().toLocaleLowerCase();
    return kits.filter((kit) => {
      if (equipo !== "TODOS LOS EQUIPOS" && kit.equipo !== equipo) return false;
      if (origen !== "todos" && kit.origen !== origen) return false;
      if (!needle) return true;
      const contenido = [kit.codigo, kit.trabajo, kit.equipo, ...kit.items.flatMap((item) => [item.np, item.sap, item.descripcion])].join(" ").toLocaleLowerCase();
      return contenido.includes(needle);
    });
  }, [kits, equipo, busqueda, origen]);

  return (
    <div className="px-4 pb-6">
      {kits.length > 0 && (
        <>
        <div className="mt-3 flex items-center gap-2 border border-line bg-surface px-3 focus-within:border-amber/60">
          <Search className="size-4 shrink-0 text-muted" />
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} aria-label="Buscar kits" placeholder="Buscar kit, N/P, SAP o equipo" className="num h-11 w-full bg-transparent text-sm placeholder:text-muted/70 focus:outline-none" />
          {busqueda && <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda de kits"><X className="size-4 text-muted" /></button>}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-3">
          {([['todos', 'Todos'], ['compartido', 'Compartidos'], ['local', 'Este dispositivo']] as const).map(([valor, etiqueta]) => <button key={valor} type="button" onClick={() => setOrigen(valor)} className={`rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold tracking-wider transition-colors ${origen === valor ? "border-amber bg-amber text-ink" : "border-line bg-surface text-muted hover:border-amber/40 hover:text-text"}`}>{etiqueta}</button>)}
        </div>
        <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 py-3">
          {equipos.map((item) => {
            const active = item === equipo;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setEquipo(item)}
                className={`num rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold tracking-wider transition-colors ${
                  active
                    ? "border-amber bg-amber text-ink"
                    : "border-line bg-surface text-muted hover:border-amber/40 hover:text-text"
                }`}
              >
                {item === "TODOS LOS EQUIPOS" ? "Todos" : item}
              </button>
            );
          })}
        </div>
        </>
      )}

      <p className="label-xs pb-2">
        {visibles.length} de {kits.length} {kits.length === 1 ? "kit" : "kits"}
      </p>

      {kits.length === 0 ? (
        <div className="border border-dashed border-line px-4 py-10 text-center">
          <Package className="mx-auto size-6 text-muted" />
          <p className="mt-2 text-sm text-text">Todavía no hay kits guardados.</p>
          <p className="mt-1 text-xs text-muted">
            Aparta los repuestos de un trabajo en el catálogo, abre la lista de pedido y pulsa{" "}
            <span className="text-amber">Crear kit</span>.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="border border-dashed border-line px-4 py-10 text-center">
          <p className="text-sm text-text">No hay kits con esos filtros.</p>
          <button type="button" onClick={() => { setBusqueda(""); setOrigen("todos"); setEquipo("TODOS LOS EQUIPOS"); }} className="mt-3 text-xs font-bold tracking-wide text-amber">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibles.map((kit) => (
            <KitCard key={kit.id} kit={kit} onOpen={onOpenKit} onAdd={onAddKit} />
          ))}
        </div>
      )}
    </div>
  );
}
