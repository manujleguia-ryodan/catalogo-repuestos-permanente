import { CloudOff, Database, RefreshCw, Cloud } from "lucide-react";
import { timeAgo } from "../lib/offline-cache";

interface SyncBarProps {
  updatedAt: string | null | undefined;
  source: "sheet" | "seed" | undefined;
  online: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

/**
 * Cabecera fija: marca y estado de los datos.
 * Ya no hay botón de actualizar: la app sincroniza sola al entrar. El estado
 * es tocable por si se quiere forzar una lectura en el momento.
 */
export function SyncBar({ updatedAt, source, online, refreshing, onRefresh }: SyncBarProps) {
  return (
    <header className="z-20 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[780px] items-center gap-3 px-4 py-3">
        <h1 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
          Repuestos
        </h1>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Actualizar ahora"
          title="Actualizar ahora"
          className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted transition-colors active:scale-95 hover:text-text disabled:opacity-70"
        >
          {refreshing ? (
            <>
              <RefreshCw className="size-3.5 animate-spin text-amber" />
              <span className="text-amber">Sincronizando…</span>
            </>
          ) : !online ? (
            <>
              <CloudOff className="size-3.5 text-warn" />
              <span className="text-warn">Sin conexión</span>
            </>
          ) : source === "sheet" ? (
            <>
              <Cloud className="size-3.5 text-ok" />
              <span>Sincronizado {timeAgo(updatedAt)}</span>
            </>
          ) : (
            <>
              <Database className="size-3.5 text-amber" />
              <span>Copia local</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
