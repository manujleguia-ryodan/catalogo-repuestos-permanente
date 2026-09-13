import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

// Data hooks live here, one file per feature — each wraps its query/mutation
// options (staleTime, select, invalidation) so components just call the hook.
// Patterns and examples: skills/app/references/web.md
export function usePing() {
  return useQuery({ queryKey: ["ping"], queryFn: api.ping });
}
