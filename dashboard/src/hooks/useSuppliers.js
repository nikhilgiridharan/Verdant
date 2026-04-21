import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

export function useSuppliers(params = {}) {
  return useQuery({
    queryKey: ["suppliers", "list", params],
    queryFn: async () => (await client.get("/suppliers", { params })).data,
  });
}
