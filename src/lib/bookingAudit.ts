import { supabase } from "@/integrations/supabase/client";

type AuditActor = {
  changedBy: string;
  changedByRole: string;
};

type ChangeRowInput = {
  bookingId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeNote?: string | null;
  actor: AuditActor;
};

const normalizeValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function resolveAuditActor(fallbackName: string, fallbackRole = "Processor"): Promise<AuditActor> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { changedBy: fallbackName, changedByRole: fallbackRole };
  }

  const meta = data.user.user_metadata ?? {};
  const changedBy = [meta.full_name, meta.name, meta.display_name, meta.preferred_name, data.user.email, fallbackName]
    .find((value) => typeof value === "string" && value.trim().length > 0) as string;
  const changedByRole = [meta.role, meta.job_title, meta.title, fallbackRole]
    .find((value) => typeof value === "string" && value.trim().length > 0) as string;

  return { changedBy, changedByRole };
}

export function buildBookingChangeRows(rows: ChangeRowInput[]) {
  return rows.map((row) => ({
    booking_id: row.bookingId,
    field_name: row.fieldName,
    old_value: normalizeValue(row.oldValue),
    new_value: normalizeValue(row.newValue),
    changed_by: row.actor.changedBy,
    changed_by_role: row.actor.changedByRole,
    change_note: row.changeNote?.trim() ? row.changeNote.trim() : null,
  }));
}