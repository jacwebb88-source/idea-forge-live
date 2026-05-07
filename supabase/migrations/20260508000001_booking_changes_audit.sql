-- ============================================================
-- Booking Changes — Audit Trail (Priority 2)
-- Every state change on a booking is logged here.
-- No hard deletes ever. All state changes logged with:
--   who (changed_by), when (changed_at), what (field_name),
--   before (old_value), after (new_value)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_changes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid        NOT NULL REFERENCES public.bookings(id),
  changed_at    timestamptz NOT NULL DEFAULT now(),
  changed_by    text,                          -- user email or user id (auth.uid when auth is wired up)
  changed_by_role text,                        -- "Processor Scheduler", "Buyer Coordinator", etc.
  field_name    text        NOT NULL,          -- e.g. "status", "head_count", "requested_kill_date"
  old_value     text,                          -- serialised as text
  new_value     text,                          -- serialised as text
  change_note   text                           -- optional free-text reason for change
);

-- Index for fast per-booking lookup
CREATE INDEX IF NOT EXISTS booking_changes_booking_id_idx
  ON public.booking_changes (booking_id, changed_at DESC);

-- Row-level security: match bookings table policy (no auth yet — open)
ALTER TABLE public.booking_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_changes_select_all"
  ON public.booking_changes FOR SELECT
  USING (true);

CREATE POLICY "booking_changes_insert_all"
  ON public.booking_changes FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies — audit records are immutable.

-- ── Convenience view: recent changes with booking context ──────────────────
CREATE OR REPLACE VIEW public.recent_booking_changes AS
SELECT
  bc.id,
  bc.booking_id,
  bc.changed_at,
  bc.changed_by,
  bc.changed_by_role,
  bc.field_name,
  bc.old_value,
  bc.new_value,
  bc.change_note,
  b.requested_kill_date,
  b.species,
  b.head_count,
  b.status,
  b.supplier_id
FROM public.booking_changes bc
JOIN public.bookings b ON b.id = bc.booking_id
ORDER BY bc.changed_at DESC;
