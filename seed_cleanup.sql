-- ============================================================
-- MUSTER — Pre-seed cleanup
-- Run this BEFORE seed_data.sql to clear the slate safely.
-- Deletes in foreign-key order so constraints don't block.
-- ============================================================

-- 1. Tables that reference bookings (must go first)
DELETE FROM compliance_checks;
DELETE FROM intake_events;

-- 2. Now safe to delete bookings
DELETE FROM bookings;

-- 3. Tables that reference plants
DELETE FROM day_plans;
DELETE FROM kpi_records;

-- 4. Root tables (no dependents)
DELETE FROM pilots;
DELETE FROM suppliers;
DELETE FROM plants;

-- ============================================================
-- Done — now run seed_data.sql
-- ============================================================
