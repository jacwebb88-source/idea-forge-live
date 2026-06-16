-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: Enterprise Demo Data
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kzgdpzdztktfchbvivhg/editor
--
-- Fixes:
--   1. Anon read policies so demo works without login
--   2. Active kill grid specs for Southern Cross Meats (enterprise plant)
--   3. Today's intake events (re-inserts safely)
--   4. kill_grades table + sample data
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. ANON READ POLICIES ───────────────────────────────────────────────────
-- The demo runs without login (anon role). These policies allow read-only access.
-- Each uses IF NOT EXISTS to avoid errors if already set.

DO $$
BEGIN
  -- bookings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'anon_read_bookings') THEN
    EXECUTE 'CREATE POLICY anon_read_bookings ON public.bookings FOR SELECT TO anon USING (true)';
  END IF;
  -- suppliers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'anon_read_suppliers') THEN
    EXECUTE 'CREATE POLICY anon_read_suppliers ON public.suppliers FOR SELECT TO anon USING (true)';
  END IF;
  -- plants
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plants' AND policyname = 'anon_read_plants') THEN
    EXECUTE 'CREATE POLICY anon_read_plants ON public.plants FOR SELECT TO anon USING (true)';
  END IF;
  -- gridspecs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gridspecs' AND policyname = 'anon_read_gridspecs') THEN
    EXECUTE 'CREATE POLICY anon_read_gridspecs ON public.gridspecs FOR SELECT TO anon USING (true)';
  END IF;
  -- intake_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'intake_events' AND policyname = 'anon_read_intake_events') THEN
    EXECUTE 'CREATE POLICY anon_read_intake_events ON public.intake_events FOR SELECT TO anon USING (true)';
  END IF;
  -- kpi_records
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kpi_records' AND policyname = 'anon_read_kpi_records') THEN
    EXECUTE 'CREATE POLICY anon_read_kpi_records ON public.kpi_records FOR SELECT TO anon USING (true)';
  END IF;
  -- compliance_checks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_checks' AND policyname = 'anon_read_compliance_checks') THEN
    EXECUTE 'CREATE POLICY anon_read_compliance_checks ON public.compliance_checks FOR SELECT TO anon USING (true)';
  END IF;
  -- day_plans
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'day_plans' AND policyname = 'anon_read_day_plans') THEN
    EXECUTE 'CREATE POLICY anon_read_day_plans ON public.day_plans FOR SELECT TO anon USING (true)';
  END IF;
  -- transport_slots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transport_slots' AND policyname = 'anon_read_transport_slots') THEN
    EXECUTE 'CREATE POLICY anon_read_transport_slots ON public.transport_slots FOR SELECT TO anon USING (true)';
  END IF;
END
$$;


-- ─── 2. ACTIVE KILL GRID SPECS ───────────────────────────────────────────────
-- Southern Cross Meats — Toowoomba (enterprise plant)
-- Effective from Jan 2026, no expiry → "active" in the UI

INSERT INTO gridspecs (id, plant_id, species, version, min_hscw, max_hscw, fat_code, dentition_or_age, effective_from, effective_to, notes)
VALUES
  -- Cattle / Beef
  ('e7000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','cattle',1, 220, 320,'2-3','0-2T','2026-01-06',NULL,'Premium domestic. MSA eligible. P8 fat 6–20mm.'),
  ('e7000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','cattle',2, 200, 260,'3-4','2T-4T','2026-01-06',NULL,'Domestic grid. P8 fat 10–22mm.'),
  ('e7000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001','cattle',3, 230, 340,'2','0-2T','2026-01-06',NULL,'Export Japan/Korea spec. EU accredited. Max P8 18mm.'),
  ('e7000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001','cattle',4, 260, 380,'2-3','0T','2026-01-06',NULL,'Export USA spec. CH graded. Min P8 6mm.'),
  ('e7000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000001','cattle',5, 180, 230,'4-5','4T+','2026-01-06',NULL,'Cow/bull schedule. Domestic only.'),
  -- Sheep / Lamb
  ('e7000000-0000-0000-0000-000000000006','e0000000-0000-0000-0000-000000000001','sheep', 1, 16, 26, 'Y1','0-2T','2026-01-06',NULL,'Lamb export — Japan. Full dentition. GR fat 5–15mm.'),
  ('e7000000-0000-0000-0000-000000000007','e0000000-0000-0000-0000-000000000001','sheep', 2, 20, 32, 'Y2','0T',  '2026-01-06',NULL,'Premium hogget domestic. GR fat 8–18mm.')
ON CONFLICT (id) DO NOTHING;


-- ─── 3. TODAY'S INTAKE EVENTS ────────────────────────────────────────────────
-- Re-insert June 16 events for today's enterprise bookings

INSERT INTO intake_events (id, booking_id, event_type, location, notes, timestamp)
VALUES
  -- Booking 7 = first June 16 booking (900 head, slot 05:00)
  ('e6000000-0000-0000-0000-000000000007','e2000000-0000-0000-0000-000000000007','arrived',  'Receiving bay 1','900 head arrived on time. 5 B-trains. NLIS mob scan complete. HGP cleared.','2026-06-16 04:55:00+10'),
  ('e6000000-0000-0000-0000-000000000008','e2000000-0000-0000-0000-000000000007','lairaged',  'Lairage pen A1', 'Watered and lairaged. No injuries. Kill order 1.','2026-06-16 05:20:00+10'),
  -- Booking 8 = second June 16 booking (620 head, slot 06:30)
  ('e6000000-0000-0000-0000-000000000009','e2000000-0000-0000-0000-000000000008','arrived',  'Receiving bay 2','620 head. MSA mob — eNVD verified. Minor delay on hwy.','2026-06-16 06:35:00+10'),
  ('e6000000-0000-0000-0000-000000000010','e2000000-0000-0000-0000-000000000008','lairaged',  'Lairage pen B1', 'Lairaged without issues. Kill order 2.','2026-06-16 06:55:00+10'),
  -- Booking 9 = third June 16 booking (510 head, slot 07:30)
  ('e6000000-0000-0000-0000-000000000011','e2000000-0000-0000-0000-000000000009','arrived',  'Receiving bay 3','510 head. Feedlot mob. eNVD matched. Kill order 3.','2026-06-16 07:25:00+10'),
  ('e6000000-0000-0000-0000-000000000012','e2000000-0000-0000-0000-000000000009','lairaged',  'Lairage pen C2', 'Settled. All heads accounted for.','2026-06-16 07:42:00+10')
ON CONFLICT (id) DO NOTHING;


-- ─── 4. KILL GRADES TABLE + DATA ─────────────────────────────────────────────
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.kill_grades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  lot_number      TEXT,
  grade_type      TEXT NOT NULL DEFAULT 'lot',   -- 'lot' or 'individual'
  hscw_kg         NUMERIC(7,2),
  ph_reading      NUMERIC(4,2),
  fat_depth_mm    NUMERIC(5,1),
  msa_grade       TEXT,
  marbling_score  TEXT,
  price_per_kg    NUMERIC(6,4),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kill_grades ENABLE ROW LEVEL SECURITY;

-- Authenticated policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kill_grades' AND policyname = 'auth_read_kill_grades') THEN
    EXECUTE 'CREATE POLICY auth_read_kill_grades ON public.kill_grades FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kill_grades' AND policyname = 'auth_write_kill_grades') THEN
    EXECUTE 'CREATE POLICY auth_write_kill_grades ON public.kill_grades FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  -- Anon read for demo
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kill_grades' AND policyname = 'anon_read_kill_grades') THEN
    EXECUTE 'CREATE POLICY anon_read_kill_grades ON public.kill_grades FOR SELECT TO anon USING (true)';
  END IF;
END
$$;

-- Sample kill grade records for yesterday's enterprise bookings
INSERT INTO kill_grades (id, booking_id, lot_number, grade_type, hscw_kg, ph_reading, fat_depth_mm, msa_grade, marbling_score, price_per_kg, notes)
VALUES
  -- Booking 1 (June 15, 820 head, Darling Downs Feedlot)
  ('e8000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001','SCM-2606150001','lot',348.0,5.62,14.0,'3 Star','Slight','7.20','Mob average — strong presentation. 12 head failed pH (>5.7).'),
  -- Booking 2 (June 15, 650 head, Granite Belt Pastoral)
  ('e8000000-0000-0000-0000-000000000002','e2000000-0000-0000-0000-000000000002','SCM-2606150002','lot',311.0,5.58,11.5,'2 Star','Nil',  '6.85','MSA result solid. Fat slightly light — borderline export spec.'),
  -- Booking 3 (June 15, 740 head, Surat Basin Pastoral)
  ('e8000000-0000-0000-0000-000000000003','e2000000-0000-0000-0000-000000000003','SCM-2606150003','lot',341.0,5.55,16.5,'3 Star','Slight','7.15','Feedlot mob excellent. 100 days on feed. Consistent grading.')
ON CONFLICT (id) DO NOTHING;


-- ─── VERIFY ───────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM gridspecs  WHERE plant_id = 'e0000000-0000-0000-0000-000000000001' AND (effective_to IS NULL OR effective_to > CURRENT_DATE)) AS active_gridspecs_expected_7,
  (SELECT COUNT(*) FROM intake_events WHERE id::text LIKE 'e6000000%')                                                                                   AS intake_events_expected_12,
  (SELECT COUNT(*) FROM kill_grades   WHERE id::text LIKE 'e8000000%')                                                                                   AS kill_grades_expected_3;
