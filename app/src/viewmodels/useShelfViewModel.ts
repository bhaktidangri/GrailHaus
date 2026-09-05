import { useQuery } from "@tanstack/react-query";
import { packsService } from "../services/packsService";

export function useShelfViewModel() {
  const query = useQuery({
    queryKey: ["packs", "cards"],
    queryFn: () => packsService.list("cards"),
  });

  return {
    packs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
