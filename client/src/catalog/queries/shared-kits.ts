import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Kit } from "../lib/kit-store";

const sharedKitsKey = ["shared-kits"];

export function useSharedKits() {
  return useQuery({
    queryKey: sharedKitsKey,
    queryFn: api.sharedKits.list,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useSharedKitActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: sharedKitsKey });
  const create = useMutation({
    mutationFn: (kit: Omit<Kit, "origen">) => api.sharedKits.create(kit),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (kit: Omit<Kit, "origen">) => api.sharedKits.update(kit),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.sharedKits.remove(id),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}
