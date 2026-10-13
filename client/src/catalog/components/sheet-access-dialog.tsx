import { FormEvent, useEffect, useRef, useState } from "react";
import { ExternalLink, LockKeyhole } from "lucide-react";
import { isValidSheetAccessKey } from "../lib/sheet-access";

type SheetAccessDialogProps = {
  open: boolean;
  url: string;
  onClose: () => void;
};

export function SheetAccessDialog({ open, url, onClose }: SheetAccessDialogProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setKey("");
      setError(false);
      return;
    }

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidSheetAccessKey(key)) {
      setError(true);
      setKey("");
      inputRef.current?.focus();
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-access-title"
        aria-describedby="sheet-access-description"
        className="panel rise w-full max-w-sm p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber/40 bg-amber/10 text-amber">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="sheet-access-title" className="font-display text-xl font-semibold tracking-wide">
              Acceso restringido
            </h2>
            <p id="sheet-access-description" className="mt-1 text-sm text-muted">
              Ingresa la clave para abrir la hoja de cálculo.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5">
          <label htmlFor="sheet-access-key" className="label-xs">
            Clave de acceso
          </label>
          <input
            ref={inputRef}
            id="sheet-access-key"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              if (error) setError(false);
            }}
            aria-invalid={error}
            aria-describedby={error ? "sheet-access-error" : undefined}
            className="num mt-2 h-11 w-full border border-line bg-ink px-3 text-base tracking-[0.3em] focus:border-amber/70 focus:outline-none"
            placeholder="••••"
          />
          {error && (
            <p id="sheet-access-error" className="mt-2 text-sm text-warn" role="alert">
              La clave no es correcta. Inténtalo nuevamente.
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 border border-line bg-surface px-4 font-display text-xs font-bold tracking-widest text-muted hover:border-amber/40 hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex h-10 items-center justify-center gap-2 bg-amber px-4 font-display text-xs font-bold tracking-widest text-ink hover:bg-amber/90"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Abrir hoja
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
