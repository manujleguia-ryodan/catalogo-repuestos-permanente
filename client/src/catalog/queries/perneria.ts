import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const perneriaKey = ["perneria"];

export function usePerneria() {
  return useQuery({
    queryKey: perneriaKey,
    queryFn: api.perneria.list,
    staleTime: 20_000,
    retry: 1,
    refetchOnReconnect: true,
  });
}

export function useRefreshPerneria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.perneria.refresh,
    onSuccess: (data) => queryClient.setQueryData(perneriaKey, data),
  });
}
