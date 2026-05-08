// Shared formatting for booking_changes records — used by Change History
// screen and the lightweight Recent Changes feed.

export type Severity = "critical" | "warning" | "info" | "positive";

export const FIELD_LABELS: Record<string, string> = {
  status:               "Booking confidence",
  head_count:           "Head count",
  requested_kill_date:  "Kill date",
  slot_time:            "Slot time",
  arrival_slot:         "Arrival slot",
  supplier_id:          "Supplier",
  plant_id:             "Plant",
  transport_status:     "Transport",
  hgp_status:           "HGP status",
  kill_order_seq:       "Kill order",
  msa_enrolled:         "MSA enrolment",
  pericardium_ok:       "Pericardium",
  species_class:        "Species class",
  agent_ref:            "Buyer / agent allocation",
  lot_id:               "Lot ID",
  fill_rate:            "Fill rate",
  exit_followup_status: "Exit-date follow-up",
  nvd_status:           "eNVD",
  nlis_status:          "NLIS",
  pic_status:           "PIC",
  mulesing_status:      "Mulesing status",
};

export const fieldLabel = (field: string): string =>
  FIELD_LABELS[field] || field.replace(/_/g, " ");

const toNum = (v: string | null) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Operational, processor-style sentence describing the change.
 * E.g. "Supplier reduced head count by 40 (320 → 280)"
 *      "Booking moved to another kill date (12 May → 14 May)"
 *      "eNVD received"
 *      "Buyer allocation changed (Teys → JBS)"
 */
export function describeChange(c: {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_role?: string | null;
}): string {
  const { field_name, old_value, new_value, changed_by_role } = c;
  const actor = (changed_by_role || "").toLowerCase();

  switch (field_name) {
    case "head_count": {
      const oldN = toNum(old_value);
      const newN = toNum(new_value);
      if (oldN != null && newN != null) {
        const delta = newN - oldN;
        const who =
          actor.includes("supplier") || actor.includes("vendor")
            ? "Supplier"
            : actor.includes("buyer")
            ? "Buyer"
            : "Operator";
        if (delta < 0) return `${who} reduced head count by ${Math.abs(delta)} (${oldN} → ${newN})`;
        if (delta > 0) return `${who} increased head count by ${delta} (${oldN} → ${newN})`;
      }
      return `Head count updated (${old_value || "—"} → ${new_value || "—"})`;
    }
    case "requested_kill_date":
      return `Booking moved to another kill date (${old_value || "—"} → ${new_value || "—"})`;
    case "agent_ref":
      return `Buyer allocation changed (${old_value || "—"} → ${new_value || "—"})`;
    case "supplier_id":
      return `Supplier / vendor reassigned`;
    case "transport_status":
      return `Transport ${new_value || "updated"}${old_value ? ` (was ${old_value})` : ""}`;
    case "nvd_status":
      if ((new_value || "").toLowerCase() === "ok") return "eNVD received";
      if ((new_value || "").toLowerCase() === "fail") return "eNVD rejected — compliance issue flagged";
      return `eNVD ${new_value || "updated"}`;
    case "nlis_status":
    case "pic_status":
      if ((new_value || "").toLowerCase() === "fail")
        return `${fieldLabel(field_name)} failed — compliance issue flagged`;
      if ((new_value || "").toLowerCase() === "ok")
        return `${fieldLabel(field_name)} verified`;
      return `${fieldLabel(field_name)} → ${new_value || "—"}`;
    case "status": {
      const v = (new_value || "").toLowerCase();
      if (v === "confirmed") return "Livestock readiness confirmed";
      if (v === "cancelled") return "Booking cancelled";
      return `Booking confidence: ${old_value || "—"} → ${new_value || "—"}`;
    }
    case "hgp_status":
      return `HGP status set to ${new_value || "—"}`;
    case "kill_order_seq":
      return `Kill order resequenced (${old_value || "—"} → ${new_value || "—"})`;
    case "arrival_slot":
    case "slot_time":
      return `Arrival slot ${old_value ? `${old_value} → ${new_value || "—"}` : `set to ${new_value || "—"}`}`;
    case "exit_followup_status":
      if ((new_value || "").toLowerCase() === "complete")
        return "Exit-date follow-up completed";
      return `Exit-date follow-up: ${new_value || "—"}`;
    default:
      return `${fieldLabel(field_name)}: ${old_value || "—"} → ${new_value || "—"}`;
  }
}

export function changeSeverity(c: {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
}): Severity {
  const { field_name, old_value, new_value } = c;
  const v = (new_value || "").toLowerCase();

  if (["nvd_status", "nlis_status", "pic_status"].includes(field_name)) {
    if (v === "fail" || v === "rejected") return "critical";
    if (v === "ok" || v === "pass" || v === "verified") return "positive";
    return "warning";
  }
  if (field_name === "status") {
    if (v === "cancelled") return "critical";
    if (v === "confirmed") return "positive";
    return "warning";
  }
  if (field_name === "head_count") {
    const oldN = toNum(old_value);
    const newN = toNum(new_value);
    if (oldN != null && newN != null && newN < oldN * 0.9) return "warning";
    return "info";
  }
  if (field_name === "requested_kill_date") return "warning";
  if (field_name === "exit_followup_status") {
    if (v === "overdue") return "critical";
    if (v === "complete") return "positive";
    return "warning";
  }
  if (["hgp_status", "kill_order_seq"].includes(field_name)) return "warning";
  return "info";
}

export const severityDot: Record<Severity, string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-500",
  info:     "bg-blue-400",
  positive: "bg-emerald-500",
};

export const severityChip: Record<Severity, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning:  "bg-amber-100 text-amber-800 border-amber-200",
  info:     "bg-blue-50 text-blue-700 border-blue-200",
  positive: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  warning:  "Action",
  info:     "Update",
  positive: "Cleared",
};

// ---- Category classification (for quick filters & icons) ----

export type ChangeCategory =
  | "scheduling"
  | "compliance"
  | "transport"
  | "supplier"
  | "buyer"
  | "other";

export function changeCategory(field: string): ChangeCategory {
  if (["requested_kill_date", "slot_time", "arrival_slot", "kill_order_seq", "status"].includes(field))
    return "scheduling";
  if (["nvd_status", "nlis_status", "pic_status", "hgp_status", "mulesing_status", "pericardium_ok", "msa_enrolled", "exit_followup_status"].includes(field))
    return "compliance";
  if (field === "transport_status") return "transport";
  if (["supplier_id", "head_count", "lot_id", "species_class"].includes(field)) return "supplier";
  if (field === "agent_ref") return "buyer";
  return "other";
}

export const categoryLabel: Record<ChangeCategory, string> = {
  scheduling: "Scheduling",
  compliance: "Compliance",
  transport:  "Transport",
  supplier:   "Supplier",
  buyer:      "Buyer",
  other:      "Other",
};

export const categoryChip: Record<ChangeCategory, string> = {
  scheduling: "bg-indigo-50 text-indigo-700 border-indigo-200",
  compliance: "bg-rose-50 text-rose-700 border-rose-200",
  transport:  "bg-sky-50 text-sky-700 border-sky-200",
  supplier:   "bg-amber-50 text-amber-800 border-amber-200",
  buyer:      "bg-violet-50 text-violet-700 border-violet-200",
  other:      "bg-slate-50 text-slate-700 border-slate-200",
};

export const categoryAccent: Record<ChangeCategory, string> = {
  scheduling: "bg-indigo-500",
  compliance: "bg-rose-500",
  transport:  "bg-sky-500",
  supplier:   "bg-amber-500",
  buyer:      "bg-violet-500",
  other:      "bg-slate-400",
};
