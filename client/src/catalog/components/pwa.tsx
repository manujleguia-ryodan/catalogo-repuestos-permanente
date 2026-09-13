import { useEffect } from "react";

/** Recursos same-origin que la app ya cargó (para precachearlos en el service worker). */
function loadedAssets(): string[] {
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const urls = entries
      .filter((entry) => ["script", "link", "css", "font", "img", "fetch"].includes(entry.initiatorType))
      .map((entry) => entry.name)
      .filter((name) => name.startsWith(window.location.origin) && !name.includes("/api/"));
    return [window.location.origin + "/", ...Array.from(new Set(urls))];
  } catch {
    return ["/"];
  }
}

/** Registra el service worker: la app queda instalable y abre sin conexión. */
export function Pwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const precache = () => {
      navigator.serviceWorker.ready
        .then((registration) => {
          const worker = registration.active ?? navigator.serviceWorker.controller;
          worker?.postMessage({ type: "precache", urls: loadedAssets() });
        })
        .catch(() => undefined);
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => setTimeout(precache, 800))
        .catch((error) => console.warn("Service worker no registrado:", error));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
