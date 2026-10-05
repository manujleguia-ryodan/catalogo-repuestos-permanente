import { useMemo, useState } from "react";
import { Check, Copy, RefreshCw, Search, Wrench } from "lucide-react";
import type { PerneriaRow, PerneriaSnapshot } from "../../../../server/perneria-store";
import { useRefreshPerneria } from "../queries/perneria";

function isType(row: PerneriaRow, type: string): boolean {
  return row.tipo.includes(type);
}

function rowLabel(row: PerneriaRow): string {
  if (isType(row, "PERNO") && row.largoMm !== null) return `${row.tipo} ${row.medida} × ${row.largoMm} mm`;
  return `${row.tipo} ${row.medida}`;
}

function formatLength(value: number | null): string {
  return value === null ? "" : Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

export function PerneriaPanel({ data, isLoading }: { data?: PerneriaSnapshot; isLoading: boolean }) {
  const refresh = useRefreshPerneria();
  const [term, setTerm] = useState("");
  const [medida, setMedida] = useState("");
  const [largo, setLargo] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const medidas = useMemo(() => Array.from(new Set((data?.rows ?? []).map((row) => row.medida))).sort((a, b) => a.localeCompare(b, "es", { numeric: true })), [data?.rows]);
  const largos = useMemo(() => Array.from(new Set((data?.rows ?? []).filter((row) => !medida || row.medida === medida).map((row) => row.largoMm).filter((value): value is number => value !== null))).sort((a, b) => a - b), [data?.rows, medida]);

  const groups = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase();
    const rows = (data?.rows ?? []).filter((row) => {
      if (medida && row.medida !== medida) return false;
      if (needle && ![row.tipo, row.medida, row.acabado, row.np, row.descripcion].join(" ").toLocaleLowerCase().includes(needle)) return false;
      return true;
    });
    const acabados = new Map<string, PerneriaRow[]>();
    for (const row of rows) {
      const current = acabados.get(row.acabado) ?? [];
      current.push(row);
      acabados.set(row.acabado, current);
    }
    return Array.from(acabados.entries()).map(([acabado, candidates]) => {
      const items = candidates.filter((row) => {
        if (!largo) return true;
        return isType(row, "PERNO") ? row.largoMm === Number(largo) : true;
      }).sort((a, b) => {
        const order = (row: PerneriaRow) => isType(row, "PERNO") ? 0 : isType(row, "TUERCA") ? 1 : isType(row, "ARANDELA") ? 2 : 3;
        return order(a) - order(b) || a.tipo.localeCompare(b.tipo, "es");
      });
      return { acabado, items };
    }).filter((group) => group.items.length > 0).sort((a, b) => a.acabado.localeCompare(b.acabado, "es"));
  }, [data?.rows, medida, largo, term]);

  const copyNp = async (np: string) => {
    try {
      await navigator.clipboard.writeText(np);
      setCopied(np);
      window.setTimeout(() => setCopied((current) => current === np ? null : current), 1400);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="px-4 pb-8" aria-labelledby="perneria-title">
      <div className="flex items-center justify-between gap-3 py-3">
        <div>
          <h2 id="perneria-title" className="font-display text-lg font-semibold tracking-wide text-text">Pernos, tuercas y arandelas</h2>
          <p className="mt-0.5 text-xs text-muted">Consulta rápida por medida, largo y acabado</p>
        </div>
        <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} className="flex items-center gap-1.5 rounded border border-line px-2.5 py-2 text-xs text-muted transition hover:border-amber/50 hover:text-amber disabled:opacity-50" title="Actualizar PERNERIA">
          <RefreshCw className={`size-3.5 ${refresh.isPending ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="panel space-y-2 rounded-lg p-3">
        <div className="flex items-center gap-2 border border-line bg-surface px-3 focus-within:border-amber/60">
          <Search className="size-4 shrink-0 text-muted" />
          <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Buscar en pernería" placeholder="Buscar tipo, N/P, medida o acabado" className="h-11 w-full bg-transparent text-sm placeholder:text-muted/70 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Medida<select value={medida} onChange={(event) => { setMedida(event.target.value); setLargo(""); }} className="mt-1 h-10 w-full rounded border border-line bg-surface px-2 text-sm text-text focus:border-amber focus:outline-none"><option value="">Todas</option>{medidas.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-xs text-muted">Largo<select value={largo} onChange={(event) => setLargo(event.target.value)} className="mt-1 h-10 w-full rounded border border-line bg-surface px-2 text-sm text-text focus:border-amber focus:outline-none"><option value="">Todos</option>{largos.map((item) => <option key={item} value={item}>{formatLength(item)} mm</option>)}</select></label>
        </div>
      </div>

      {isLoading ? <div className="py-12 text-center text-sm text-muted">Cargando PERNERIA…</div> : data?.error ? <div className="mt-4 border border-warn/40 bg-warn/10 px-4 py-4 text-sm text-warn">No se pudo leer la hoja PERNERIA: {data.error}</div> : groups.length === 0 ? <div className="mt-4 border border-dashed border-line px-4 py-12 text-center"><Wrench className="mx-auto size-7 text-muted" /><p className="mt-3 text-sm text-text">No hay resultados de PERNERIA.</p><p className="mt-1 text-xs text-muted">Agrega filas válidas en la hoja PERNERIA de Google Sheets y pulsa Actualizar.</p></div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{groups.map((group) => <div key={group.acabado} className="panel rounded-lg p-3"><div className="mb-2 flex items-center justify-between border-b border-amber/30 pb-2"><h3 className="font-display text-sm font-bold tracking-widest text-amber">{group.acabado}</h3><span className="text-[10px] text-muted">{group.items.length} componente{group.items.length === 1 ? "" : "s"}</span></div><div className="space-y-2">{group.items.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded border border-line/70 bg-surface/60 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm text-text">{row.descripcion || rowLabel(row)}</p><p className="num mt-0.5 text-xs text-muted">{rowLabel(row)}</p><p className="num mt-0.5 text-xs font-semibold text-text">N/P {row.np}</p></div><button type="button" onClick={() => copyNp(row.np)} className="shrink-0 rounded border border-line p-2 text-muted transition hover:border-amber hover:text-amber" aria-label={`Copiar N/P ${row.np}`} title="Copiar N/P">{copied === row.np ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}</button></div>)}</div></div>)}</div>}
    </section>
  );
}
