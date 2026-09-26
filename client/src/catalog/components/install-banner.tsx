import { useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { useInstallPrompt } from "../hooks/use-install-prompt";

/** Invita a crear el acceso directo en la pantalla de inicio (PWA). */
export function InstallBanner() {
  const { canInstall, needsIosInstructions, isStandalone, dismissed, install, dismiss } =
    useInstallPrompt();
  const [showIos, setShowIos] = useState(false);

  if (isStandalone || dismissed || (!canInstall && !needsIosInstructions)) return null;

  return (
    <div className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[780px] items-center gap-3 px-4 py-3">
        <Smartphone className="size-5 shrink-0 text-amber" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold tracking-wide">
            Instalar como aplicación
          </p>
          <p className="truncate text-xs text-muted">
            {showIos
              ? "Toca Compartir y luego «Añadir a pantalla de inicio»"
              : "Acceso directo en la pantalla de inicio, abre sin navegador"}
          </p>
        </div>
        {canInstall ? (
          <button
            type="button"
            onClick={() => void install()}
            className="h-9 shrink-0 bg-amber px-4 font-display text-sm font-bold tracking-wide text-ink active:scale-[0.98]"
          >
            Instalar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIos((v) => !v)}
            className="flex h-9 shrink-0 items-center gap-1.5 border border-amber/50 px-3 font-display text-sm font-bold tracking-wide text-amber active:scale-[0.98]"
          >
            <Share className="size-4" />
            Cómo
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Descartar"
          className="grid size-9 shrink-0 place-items-center text-muted hover:text-text"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
