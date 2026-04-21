import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

export function usePipelineStatus() {
  return useQuery({
    queryKey: ["pipeline", "status"],
    queryFn: async () => (await client.get("/pipeline/status")).data,
    refetchInterval: 30_000,
  });
}
