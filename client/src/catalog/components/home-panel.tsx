import { useMemo } from "react";
import { Flame, Package } from "lucide-react";
import type { Part } from "../lib/offline-cache";
import type { Kit } from "../lib/kit-store";
import { pickTopParts, useUsage } from "../lib/usage-store";
import { QtyPicker } from "./part-row";
import { KitCard } from "./kit-card";

/**
 * Pantalla de inicio: con el buscador vacío y sin filtro de equipo no se
 * vuelca el catálogo entero, se muestra lo que se usa a diario — los kits de
 * mantenimiento y los repuestos más pedidos.
 */
export function HomePanel({
  rows,
  kits,
  onOpenKit,
  onAddKit,
  onOpenPart,
  onVerKits,
}: {
  rows: Part[];
  kits: Kit[];
  onOpenKit: (kit: Kit) => void;
  onAddKit: (kit: Kit) => void;
  onOpenPart: (part: Part) => void;
  onVerKits: () => void;
}) {
  const usage = useUsage();
  const top = useMemo(() => pickTopParts(rows, usage, 10), [rows, usage]);
  const visibles = kits.slice(0, 6);

  return (
    <div className="px-4 pb-6">
      <section>
        <div className="flex items-baseline justify-between py-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-widest uppercase">
            <Package className="size-4 text-amber" /> Kits de mantenimiento
          </h2>
          {kits.length > visibles.length && (
            <button
              type="button"
              onClick={onVerKits}
              className="label-xs text-amber hover:underline"
            >
              Ver los {kits.length}
            </button>
          )}
        </div>

        {kits.length === 0 ? (
          <div className="border border-dashed border-line px-4 py-6 text-center">
            <p className="text-sm text-text">Todavía no hay kits guardados.</p>
            <p className="mt-1 text-xs text-muted">
              Aparta los repuestos de un trabajo, abre el pedido y pulsa{" "}
              <span className="text-amber">Crear kit</span>: la próxima vez lo cargas de un toque.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibles.map((kit) => (
              <KitCard key={kit.id} kit={kit} onOpen={onOpenKit} onAdd={onAddKit} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between py-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-widest uppercase">
            <Flame className="size-4 text-amber" /> Top repuestos
          </h2>
          <span className="label-xs">{top.esEjemplo ? "Ejemplo" : "Tu uso"}</span>
        </div>

        {top.esEjemplo && top.items.length > 0 && (
          <p className="mb-2 text-[11px] text-muted">
            Todavía no hay pedidos registrados en este equipo: mostramos los repuestos que la hoja
            marca con cantidad requerida. Se irá ajustando con tu uso real.
          </p>
        )}

        {top.items.length === 0 ? (
          <p className="text-xs text-muted">Sin datos de uso todavía.</p>
        ) : (
          <ul className="border border-line">
            {top.items.map(({ part, veces }) => (
              <li
                key={part.id}
                className="flex items-center gap-3 border-b border-line/70 px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenPart(part)}
                    aria-label={`Ver detalle de ${part.descripcion || "repuesto"}`}
                    className="block w-full truncate text-left text-sm text-text underline decoration-line decoration-dotted underline-offset-4 transition-colors hover:text-amber"
                  >
                    {part.descripcion || "Sin descripción"}
                  </button>
                  <p className="num mt-0.5 truncate text-[11px] text-muted">
                    {part.equipo || "—"} · N/P {part.np || "—"}
                    {veces > 0 && <span className="text-amber"> · {veces}×</span>}
                  </p>
                </div>
                <div className="shrink-0">
                  <QtyPicker id={part.id} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
