import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PackSku } from "@grailhaus/shared";
import { packsService } from "../services/packsService";

export type DropPhase = "soon" | "live" | "closed";

export interface DropView {
  sku: PackSku;
  phase: DropPhase;
}

/** Tighter than the app's normal 30s staleTime (see state/queryClient.ts) —
 * a live drop's stock/remaining-time is the one place in the app where
 * "polling every 30s" (PRD §29) feels too slow to watch happen. Only kicks
 * in while a drop is actually soon/live; falls back to the default cadence
 * once every drop is closed. */
const LIVE_POLL_MS = 10_000;

function phaseFor(sku: PackSku, now: number): DropPhase {
  const goesLiveAt = sku.goesLiveAt ? new Date(sku.goesLiveAt).getTime() : null;
  const endsAt = sku.endsAt ? new Date(sku.endsAt).getTime() : null;
  if (goesLiveAt != null && now < goesLiveAt) return "soon";
  if (endsAt != null && now >= endsAt) return "closed";
  if (sku.stockRemaining != null && sku.stockRemaining <= 0) return "closed";
  return "live";
}

/**
 * There's no dedicated `/drops` endpoint — a "drop" is just any `PackSku`
 * with a non-null `goesLiveAt` (see shared/src/types.ts). This fetches the
 * full catalog and derives each drop's soon/live/closed state client-side.
 */
export function useDropsViewModel() {
  const query = useQuery({
    queryKey: ["packs", "all"],
    queryFn: () => packsService.list(),
    refetchInterval: (q) => {
      const data = q.state.data as PackSku[] | undefined;
      const now = Date.now();
      const hasActiveDrop = (data ?? []).some(
        (sku) => sku.goesLiveAt != null && phaseFor(sku, now) !== "closed"
      );
      return hasActiveDrop ? LIVE_POLL_MS : false;
    },
  });

  const drops = useMemo<DropView[]>(() => {
    const now = Date.now();
    return (query.data ?? [])
      .filter((sku) => sku.goesLiveAt != null)
      .map((sku) => ({ sku, phase: phaseFor(sku, now) }));
  }, [query.data]);

  return {
    drops,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
