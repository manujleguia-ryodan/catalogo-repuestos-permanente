import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CatalogResponse } from "../lib/api";
import { readLocalCatalog, writeLocalCatalog, type CatalogData } from "../lib/offline-cache";

const catalogKey = ["catalog"];

export function useCatalog() {
  const local = readLocalCatalog();
  return useQuery<CatalogResponse>({
    queryKey: catalogKey,
    queryFn: api.catalog.list,
    staleTime: 0,
    retry: 1,
    placeholderData: local ?? undefined,
    initialData: local ?? undefined,
    initialDataUpdatedAt: local?.cachedAt ? new Date(local.cachedAt).getTime() : undefined,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });
}

export function useRefreshCatalog() {
  const queryClient = useQueryClient();
  return useMutation<CatalogResponse, Error>({
    mutationFn: api.catalog.refresh,
    onSuccess: (data) => {
      const next: CatalogData = {
        rows: data.rows,
        updatedAt: data.updatedAt,
        source: data.source,
        count: data.count,
        sheetUrl: data.sheetUrl,
      };
      writeLocalCatalog(next);
      queryClient.setQueryData(catalogKey, data);
    },
  });
}
