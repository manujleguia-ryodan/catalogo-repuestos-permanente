import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, Search, X } from "lucide-react";
import { InstallBanner } from "../components/install-banner";
import { PartRow } from "../components/part-row";
import { PartModal } from "../components/part-modal";
import { SyncBar } from "../components/sync-bar";
import { OrderFab, OrderSheet } from "../components/order-sheet";
import { HomePanel } from "../components/home-panel";
import { KitList } from "../components/kit-list";
import { KitModal } from "../components/kit-modal";
import { PerneriaPanel } from "../components/perneria-panel";
import { SheetAccessDialog } from "../components/sheet-access-dialog";
import { useCatalog, useRefreshCatalog } from "../queries/catalog";
import { useOnline } from "../hooks/use-online";
import { normalize, timeAgo, writeLocalCatalog, type Part } from "../lib/offline-cache";
import { useQuantities } from "../lib/qty-store";
import { buildOrder } from "../lib/order-text";
import { reconcileLocalKitCodes, sortKits, useKits, type Kit } from "../lib/kit-store";
import { applyKitToOrder } from "../lib/kit-order";
import { useSharedKits } from "../queries/shared-kits";
import { usePerneria } from "../queries/perneria";

function Index() {
  const [term, setTerm] = useState("");
  const [equipo, setEquipo] = useState<string>("TODOS LOS EQUIPOS");
  const [notice, setNotice] = useState<string | null>(null);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [detalle, setDetalle] = useState<Part | null>(null);
  const [tab, setTab] = useState<"catalogo" | "kits" | "perneria">("catalogo");
  const [kitAbierto, setKitAbierto] = useState<Kit | null>(null);
  const [sheetAccessOpen, setSheetAccessOpen] = useState(false);

  const online = useOnline();
  const catalog = useCatalog();
  const refresh = useRefreshCatalog();
  const cantidades = useQuantities();
  const kits = useKits();
  const shared = useSharedKits();
  const perneria = usePerneria();
  const todosLosKits = useMemo(() => sortKits([...(shared.data?.kits ?? []), ...kits]), [shared.data?.kits, kits]);

  useEffect(() => {
    if (shared.data?.kits) reconcileLocalKitCodes(shared.data.kits.map((kit) => kit.codigo));
  }, [shared.data?.kits]);

  // Cada respuesta del servidor se guarda como copia local del dispositivo.
  useEffect(() => {
    if (catalog.data && catalog.isFetched) writeLocalCatalog(catalog.data);
  }, [catalog.data, catalog.isFetched]);

  // Al entrar, el servidor intenta leer la hoja; si no pudo, avisamos.
  useEffect(() => {
    if (catalog.isFetched && catalog.data?.synced === false) {
      setNotice("No se pudo leer Google Sheets al entrar. Mostrando la última copia guardada.");
    }
  }, [catalog.isFetched, catalog.data?.synced]);

  const rows = useMemo<Part[]>(() => catalog.data?.rows ?? [], [catalog.data?.rows]);

  const equipos = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) if (row.equipo) set.add(row.equipo);
    return ["TODOS LOS EQUIPOS", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = normalize(term);
    return rows.filter((row) => {
      if (equipo !== "TODOS LOS EQUIPOS" && row.equipo !== equipo && row.equipo !== "TODOS") {
        return false;
      }
      if (!needle) return true;
      return normalize(`${row.equipo} ${row.np} ${row.descripcion} ${row.sap}`).includes(needle);
    });
  }, [rows, term, equipo]);

  // Pedido en curso: cruce del catálogo con las cantidades guardadas.
  const order = useMemo(() => buildOrder(rows, cantidades), [rows, cantidades]);

  // Sin búsqueda ni filtro de equipo no se vuelca el catálogo entero:
  // la pantalla arranca con los kits y los repuestos más usados.
  const estadoInicial = term.trim() === "" && equipo === "TODOS LOS EQUIPOS";

  const agregarKit = (kit: Kit) => {
    const { aplicados, faltantes } = applyKitToOrder(kit, rows);
    setNotice(
      faltantes.length === 0
        ? `${kit.codigo}: ${aplicados} repuestos cargados en la lista de pedido.`
        : `${kit.codigo}: ${aplicados} cargados. Sin coincidencia en el catálogo: ${faltantes.join(", ")}.`,
    );
    setResumenAbierto(true);
  };

  const onRefresh = () => {
    setNotice(null);
    refresh.mutate(undefined, {
      onSuccess: (data) => {
        setNotice(
          data.synced
            ? `Actualizado: ${data.count} repuestos desde Google Sheets`
            : `No se pudo sincronizar (${data.error}). Mostrando la última copia guardada.`,
        );
      },
      onError: () => setNotice("Sin conexión con el servidor. Mostrando la copia local."),
    });
  };

  const loadingFirstTime = catalog.isLoading && rows.length === 0;

  return (
    <div className="noise flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0">
        <SyncBar
          updatedAt={catalog.data?.updatedAt}
          source={catalog.data?.source}
          online={online}
          refreshing={refresh.isPending || catalog.isFetching}
          onRefresh={onRefresh}
        />
        <InstallBanner />
      </div>

      {notice && (
        <div className="mx-auto w-full max-w-[780px] shrink-0 px-4 pt-3">
          <div className="flex items-start gap-2 border border-amber/40 bg-amber/10 px-3 py-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" />
            <p className="flex-1 text-text/90">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
              <X className="size-4 text-muted" />
            </button>
          </div>
        </div>
      )}

      <div className="shrink-0 bg-ink/85 pt-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[780px] px-4">
          <div className="mb-2.5 flex gap-2">
            {(
              [
                ["catalogo", "Catálogo"],
                ["kits", `Kits de repuestos${kits.length > 0 ? ` (${kits.length})` : ""}`],
                ["perneria", "Pernería"],
              ] as const
            ).map(([valor, etiqueta]) => {
              const active = tab === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTab(valor)}
                  className={`h-10 flex-1 border font-display text-[11px] font-bold tracking-widest transition-colors ${
                    active
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-line bg-surface text-muted hover:border-amber/40 hover:text-text"
                  }`}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "catalogo" && (
        <div className="mx-auto w-full max-w-[780px] px-4">
          <div className="flex items-center gap-2 border border-line bg-surface px-3 focus-within:border-amber/60">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              inputMode="search"
              aria-label="Buscar repuestos"
              placeholder="Buscar N/P, SAP, descripción o equipo"
              className="num h-12 w-full bg-transparent text-base placeholder:font-body placeholder:tracking-normal placeholder:text-muted/70 focus:outline-none"
            />
            {term && (
              <button type="button" onClick={() => setTerm("")} aria-label="Limpiar búsqueda">
                <X className="size-4 text-muted" />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-1.5 gap-y-1.5 pb-2.5">
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
        </div>
        )}
      </div>

      <main className="mx-auto w-full max-w-[780px] flex-1 overflow-y-auto overscroll-contain px-0 pb-28">
        {tab === "kits" ? (
        <KitList kits={todosLosKits} onOpenKit={setKitAbierto} onAddKit={agregarKit} />
        ) : tab === "perneria" ? (
        <PerneriaPanel data={perneria.data} isLoading={perneria.isLoading} />
        ) : (
        <>
        <div className="flex items-baseline justify-between px-4 py-3">
          <p className="label-xs">
            {estadoInicial
              ? `${rows.length} repuestos en el catálogo`
              : `${filtered.length} de ${rows.length} repuestos`}
          </p>
          {catalog.isFetching && !refresh.isPending && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="size-3 animate-spin" /> revisando
            </span>
          )}
        </div>

        {loadingFirstTime ? (
          <ul>
            {Array.from({ length: 8 }).map((_, index) => (
              <li key={index} className="border-b border-line/70 px-4 py-4">
                <div className="h-3 w-16 animate-pulse bg-surface-2" />
                <div className="mt-2 h-5 w-40 animate-pulse bg-surface-2" />
                <div className="mt-2 h-3 w-56 animate-pulse bg-surface-2" />
              </li>
            ))}
          </ul>
        ) : estadoInicial ? (
          <HomePanel
            rows={rows}
            kits={todosLosKits}
            onOpenKit={setKitAbierto}
            onAddKit={agregarKit}
            onOpenPart={setDetalle}
            onVerKits={() => setTab("kits")}
          />
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-display text-lg font-semibold tracking-wide">
              Sin resultados
            </p>
            <p className="mt-1 text-sm text-muted">
              Prueba con otro número de parte, SAP o descripción.
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((part, index) => (
              <PartRow
                key={part.id}
                part={part}
                term={term}
                index={index}
                onOpen={setDetalle}
              />
            ))}
          </ul>
        )}

        <footer className="mt-8 flex flex-col gap-3 px-4 text-xs text-muted">
          <p>
            Origen: Google Sheets · última sincronización {timeAgo(catalog.data?.updatedAt)} ·
            {" "}
            {catalog.data?.source === "sheet" ? "datos de la nube" : "copia incluida"}
          </p>
          <div className="flex items-center gap-4">
            {catalog.data?.sheetUrl && (
              <button
                type="button"
                onClick={() => setSheetAccessOpen(true)}
                className="flex items-center gap-1.5 text-muted hover:text-amber"
              >
                <ExternalLink className="size-3.5" /> Abrir hoja de cálculo
              </button>
            )}
          </div>
        </footer>
        </>
        )}
      </main>

      <OrderFab order={order} onOpen={() => setResumenAbierto(true)} />
      <OrderSheet
        order={order}
        open={resumenAbierto}
        onClose={() => setResumenAbierto(false)}
        rows={rows}
        equipos={equipos}
      />
      <PartModal part={detalle} onClose={() => setDetalle(null)} />
      <KitModal key={kitAbierto?.id ?? "sin-kit"} kit={kitAbierto} rows={rows} equipos={equipos} onClose={() => setKitAbierto(null)} onNotice={setNotice} />
      {catalog.data?.sheetUrl && (
        <SheetAccessDialog
          open={sheetAccessOpen}
          url={catalog.data.sheetUrl}
          onClose={() => setSheetAccessOpen(false)}
        />
      )}
    </div>
  );
}

export default Index;
