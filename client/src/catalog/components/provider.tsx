import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// networkMode "always": sin señal las peticiones fallan de inmediato en vez de
// quedar en pausa indefinida. La app es offline-first vía caché local, así que
// nunca queremos un botón atascado en "Actualizando".
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always", retry: 1 },
    mutations: { networkMode: "always" },
  },
});

interface ProviderProps {
  children: React.ReactNode;
}

// App-level providers — add theme/context providers here, wrapping children.
// QueryClientProvider must stay (all API calls run through TanStack Query).
export function Provider({ children }: ProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
