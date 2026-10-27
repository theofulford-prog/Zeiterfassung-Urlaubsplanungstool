import { LEAVE_STATUS, LEAVE_TYPES } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`badge ${cls}`}>{LEAVE_STATUS[status] ?? status}</span>;
}

export function TypeLabel({ type }: { type: string }) {
  return <>{LEAVE_TYPES[type] ?? type}</>;
}
