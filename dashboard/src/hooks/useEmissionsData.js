import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

export function useEmissionsSummary() {
  return useQuery({
    queryKey: ["emissions", "summary"],
    queryFn: async () => (await client.get("/emissions/summary")).data,
    refetchInterval: 60_000,
  });
}

export function useMapData() {
  return useQuery({
    queryKey: ["suppliers", "map"],
    queryFn: async () => (await client.get("/suppliers/map-data")).data,
    refetchInterval: 120_000,
  });
}
