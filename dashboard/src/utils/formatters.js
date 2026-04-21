import { formatDistanceToNow } from "date-fns";

export function formatKg(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kg`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k kg`;
  return `${n?.toFixed?.(1) ?? n} kg`;
}

export function relTime(iso) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}
