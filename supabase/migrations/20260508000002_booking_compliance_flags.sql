-- ============================================================
-- Booking Compliance Flags (Field Intelligence — critical gaps)
-- Adds compliance-critical fields to bookings table:
--   hgp_status      — HGP-free or HGP-treated (kill order sequencing)
--   kill_order_seq  — explicit sequence number within a kill day (HGP-free must come first)
--   pericardium_ok  — pericardium status (ACC/Kilcoy requirement)
--   msa_enrolled    — MSA enrolment (Buyer program requirement)
--   mulesing_status — REQUIRED for EU/UK market access (GMP lamb)
--   species_class   — kill class/category/program (grain-fed, grass-fed, Certified Organic, etc.)
--   days_on_feed    — feedlot days on feed (withhold compliance check)
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hgp_status       text    CHECK (hgp_status IN ('hgp_free', 'hgp_treated', 'unknown')),
  ADD COLUMN IF NOT EXISTS kill_order_seq   integer,          -- lower = earlier in kill day
  ADD COLUMN IF NOT EXISTS pericardium_ok   boolean,
  ADD COLUMN IF NOT EXISTS msa_enrolled     boolean,
  ADD COLUMN IF NOT EXISTS mulesing_status  text    CHECK (mulesing_status IN ('mulesed', 'unmulesed', 'cesa', 'pain_relief', 'not_applicable', 'unknown')),
  ADD COLUMN IF NOT EXISTS species_class    text,             -- e.g. "MSA Grain-fed", "EU Accredited", "Certified Organic"
  ADD COLUMN IF NOT EXISTS days_on_feed     integer,
  ADD COLUMN IF NOT EXISTS arrival_slot     text,             -- 30-min window e.g. "06:00–06:30"
  ADD COLUMN IF NOT EXISTS trucking_advice  text;             -- free text or JSON for trucking advice output

-- Index for kill order sequencing queries (must sort HGP-free first within a day)
CREATE INDEX IF NOT EXISTS bookings_kill_date_hgp_idx
  ON public.bookings (requested_kill_date, hgp_status, kill_order_seq);

-- Comment the kill_order_seq logic:
COMMENT ON COLUMN public.bookings.hgp_status IS
  'HGP treatment status. hgp_free animals MUST be killed before hgp_treated on the same chain (cross-contamination compliance).';

COMMENT ON COLUMN public.bookings.kill_order_seq IS
  'Explicit kill order position within a day. Auto-sort: hgp_free first, then hgp_treated. Scheduler can manually override.';

COMMENT ON COLUMN public.bookings.mulesing_status IS
  'Mulesing status — required for EU and UK market programs. Missing = market access risk.';
