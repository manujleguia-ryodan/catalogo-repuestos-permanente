import { useEffect, useState } from "react";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import type { Part } from "../lib/offline-cache";
import {
  kitFingerprint,
  normalizeEquipo,
  deleteKit,
  updateKit,
  validateKit,
  type Kit,
  type KitItem,
} from "../lib/kit-store";
import { useSharedKitActions } from "../queries/shared-kits";
import { ApiRequestError } from "../lib/api";

export function KitEditDialog({
  kit,
  rows: _rows,
  equipos,
  onClose,
  onShared,
}: {
  kit: Kit | null;
  rows: Part[];
  equipos: string[];
  onClose: () => void;
  onShared?: (message: string) => void;
}) {
  const [trabajo, setTrabajo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [items, setItems] = useState<KitItem[]>([]);
  const [compartir, setCompartir] = useState(false);
  const [confirmarCompartir, setConfirmarCompartir] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const sharedActions = useSharedKitActions();

  useEffect(() => {
    if (!kit) return;
    setTrabajo(kit.trabajo);
    setEquipo(kit.equipo);
    setItems(kit.items.map((item) => ({ ...item })));
    setCompartir(kit.origen === "compartido");
    setConfirmarCompartir(false);
    setAviso(null);
  }, [kit]);

  useEffect(() => {
    if (!kit) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kit, onClose]);

  if (!kit) return null;

  const draft = { trabajo, equipo, items };
  const errores = validateKit(draft);
  const opciones = equipos.filter((item) => item !== "TODOS LOS EQUIPOS" && item !== "TODOS");

  const changeQty = (np: string, value: string) => {
    const qty = value === "" ? 0 : Math.max(0, Math.trunc(Number(value)) || 0);
    setItems((current) => current.map((item) => (item.np === np ? { ...item, qty } : item)));
  };

  const guardar = async () => {
    if (errores.length > 0) return;
    if (kit.origen === "local" && compartir && !confirmarCompartir) {
      setConfirmarCompartir(true);
      return;
    }
    const normalizedItems = items.map((item) => ({ ...item, qty: Math.trunc(item.qty) }));
    const normalizedEquipo = normalizeEquipo(equipo);
    const next = {
      ...kit,
      trabajo: trabajo.trim(),
      equipo: normalizedEquipo,
      items: normalizedItems,
      fingerprint: kitFingerprint(normalizedEquipo, normalizedItems),
      actualizadoEn: new Date().toISOString(),
    };

    if (kit.origen === "compartido" || compartir) {
      const { origen: _origen, ...payload } = next;
      try {
        if (kit.origen === "compartido") {
          await sharedActions.update.mutateAsync(payload);
        } else {
          const result = await sharedActions.create.mutateAsync(payload);
          deleteKit(kit.id);
          const codigo = result.kit?.codigo ?? payload.codigo;
          onShared?.(`Kit compartido correctamente como ${codigo}. Ya está disponible para todos los usuarios.`);
        }
        onClose();
      } catch (error) {
        if (error instanceof ApiRequestError && typeof error.data === "object" && error.data && "kit" in error.data) {
          const existente = (error.data as { kit: Kit }).kit;
          setAviso(`No se compartió: los mismos componentes ya están en ${existente.codigo}.`);
        } else if (error instanceof ApiRequestError) {
          const detalle = typeof error.data === "object" && error.data && "error" in error.data && typeof error.data.error === "string" ? error.data.error : error.message;
          setAviso(`No se pudo compartir: ${detalle}`);
        } else {
          setAviso("No se pudo compartir el kit. Revisa tu conexión e inténtalo otra vez.");
        }
      }
      return;
    }

    const resultado = updateKit(kit.id, draft);
    if (resultado.ok) {
      onClose();
    } else if (resultado.motivo === "duplicado") {
      setAviso(`Ese conjunto ya existe en ${resultado.kit.codigo}. Cambia las cantidades o usa el kit existente.`);
    } else {
      setAviso(resultado.errores.join(" "));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-2 sm:p-4">
      <button type="button" aria-label="Cerrar edición" onClick={onClose} className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />
      <dialog open aria-modal="true" aria-label={`Editar ${kit.codigo}`} className="relative m-0 flex max-h-[88dvh] w-full max-w-[480px] flex-col border border-amber/40 bg-ink">
        <div className="flex items-start gap-2 border-b border-line px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-display text-[10px] font-bold tracking-widest text-amber uppercase">
              <Pencil className="size-3" /> Editar kit {kit.codigo}
            </span>
            <p className="mt-1 text-xs text-muted">
              {kit.origen === "compartido" ? "Los cambios los verán todos los usuarios." : "Cambios guardados en este dispositivo."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center border border-line text-muted hover:border-amber/50 hover:text-amber">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <label className="block">
            <span className="label-xs">Nombre del trabajo</span>
            <input value={trabajo} onChange={(event) => setTrabajo(event.target.value)} aria-label="Nombre del trabajo" maxLength={80} className="mt-1 h-12 w-full border border-line bg-surface px-3 text-base text-text focus:border-amber/60 focus:outline-none" />
          </label>
          <label className="mt-3 block">
            <span className="label-xs">Equipo</span>
            <select value={equipo} onChange={(event) => setEquipo(event.target.value)} className="num mt-1 h-12 w-full border border-line bg-surface px-3 text-base text-text focus:border-amber/60 focus:outline-none">
              <option value="">Elegir equipo…</option>
              {opciones.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <p className="label-xs mt-4">Repuestos y cantidades</p>
          <ul className="mt-1 border border-line">
            {items.map((item) => (
              <li key={item.np} className="flex items-center gap-2 border-b border-line/70 px-2.5 py-2 last:border-b-0">
                <span className="num min-w-0 flex-1 truncate text-xs text-text">{item.np}<span className="text-muted"> · {item.descripcion || "sin descripción"}</span></span>
                <input type="number" min="1" max="9999" value={item.qty || ""} onChange={(event) => changeQty(item.np, event.target.value)} aria-label={`Cantidad de ${item.np}`} className="num h-9 w-20 border border-line bg-surface px-2 text-center text-sm text-text focus:border-amber/60 focus:outline-none" />
              </li>
            ))}
          </ul>

          <label className={`mt-4 flex items-center gap-3 border px-3 py-3 ${kit.origen === "compartido" ? "border-amber/50 bg-amber/5" : "border-line bg-surface"}`}>
            <input type="checkbox" checked={compartir} onChange={(event) => setCompartir(event.target.checked)} disabled={kit.origen === "compartido"} className="size-4 accent-amber" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text">{kit.origen === "compartido" ? "Kit compartido" : "Compartir este kit"}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{kit.origen === "compartido" ? "Todos los usuarios pueden verlo, cargarlo y editarlo." : "Todos los usuarios podrán verlo, cargarlo y editarlo."}</span>
            </span>
          </label>

          {errores.length > 0 && <ul className="mt-3 space-y-1">{errores.map((error) => <li key={error} className="flex items-start gap-1.5 text-[11px] text-warn"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {error}</li>)}</ul>}
          {aviso && <p className="mt-3 flex items-start gap-1.5 text-xs text-warn"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {aviso}</p>}
          {confirmarCompartir && <div className="mt-3 border border-amber/50 bg-amber/10 px-3 py-3 text-xs text-text">
            <p className="font-semibold">¿Compartir este kit con todos los usuarios?</p>
            <p className="mt-1 text-muted">Se quitará la copia local y el kit quedará disponible para cargarlo y editarlo desde cualquier dispositivo.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirmarCompartir(false)} className="h-9 flex-1 border border-line text-[11px] font-bold uppercase text-muted">Cancelar</button>
              <button type="button" onClick={guardar} className="h-9 flex-1 bg-amber text-[11px] font-bold uppercase text-ink">Confirmar y compartir</button>
            </div>
          </div>}
        </div>

        <div className="border-t border-line px-3 pt-3 pb-6">
          <button type="button" onClick={guardar} disabled={errores.length > 0 || sharedActions.update.isPending || sharedActions.create.isPending} className="flex h-12 w-full items-center justify-center gap-2 bg-amber font-display text-sm font-bold tracking-widest text-ink uppercase transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted">
            <Check className="size-4" /> {sharedActions.update.isPending || sharedActions.create.isPending ? "Guardando…" : compartir && kit.origen === "local" ? "Compartir kit" : "Guardar cambios"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
