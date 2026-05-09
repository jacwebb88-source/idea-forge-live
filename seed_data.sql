-- ============================================================
-- MUSTER SEED DATA — Medium-Large Australian Abattoir
-- Plant:   Riverbank Meats Dubbo (NSW, Export licensed)
-- Kill cap: ~1,200 beef/day  |  ~600 lamb/day
-- Today:   2026-05-09 (Friday)
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- All inserts are idempotent via ON CONFLICT DO NOTHING
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. PLANT
-- ─────────────────────────────────────────────────────────────

INSERT INTO plants (id, plant_name, company_name, licence_type, is_default, species_supported, state)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Riverbank Meats Dubbo',
  'Riverbank Processing Pty Ltd',
  'Export',
  true,
  ARRAY['beef', 'sheep', 'lamb'],
  'NSW'
)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 1. SUPPLIERS  (mix of producers, feedlots, agents)
-- ─────────────────────────────────────────────────────────────

INSERT INTO suppliers (id, name, contact_name, email, phone, abn, type) VALUES
  ('aaa00000-0000-0000-0000-000000000001', 'Outback Pastoral Co',          'Bruce McLean',       'bruce@outbackpastoral.com.au',     '0427 811 234', '34 567 891 011', 'producer'),
  ('aaa00000-0000-0000-0000-000000000002', 'Murray Basin Cattle Co',       'Darren Kowalski',    'darren@murraybasincattle.com.au',  '0408 323 441', '78 234 567 890', 'feedlot'),
  ('aaa00000-0000-0000-0000-000000000003', 'Riverina Livestock Agents',    'Sandra Tran',        'sandra@riverinalivestock.com.au',  '0412 655 789', '21 345 678 901', 'agent'),
  ('aaa00000-0000-0000-0000-000000000004', 'Macquarie Valley Pastoral',    'Greg O''Brien',      'greg@mqvpastoral.com.au',          '0439 112 877', '56 789 012 345', 'producer'),
  ('aaa00000-0000-0000-0000-000000000005', 'Hunter Valley Beef',           'Trish Hammond',      'trish@huntervalleybeef.com.au',    '0411 987 562', '89 012 345 678', 'producer'),
  ('aaa00000-0000-0000-0000-000000000006', 'Blue Mountains Feedlot',       'Craig Stephenson',   'craig@bmlot.com.au',               '0428 443 991', '12 345 678 901', 'feedlot'),
  ('aaa00000-0000-0000-0000-000000000007', 'Central West Lamb Co',         'Fiona Park',         'fiona@cwlamb.com.au',              '0417 233 556', '45 678 901 234', 'producer'),
  ('aaa00000-0000-0000-0000-000000000008', 'Namoi Valley Producers',       'Ray Thornton',       'ray@namoivalley.com.au',           '0402 774 338', '67 890 123 456', 'agent'),
  ('aaa00000-0000-0000-0000-000000000009', 'Southern Highlands Pastoral',  'Leanne Forsyth',     'leanne@shpastoral.com.au',         '0435 887 123', '90 123 456 789', 'producer'),
  ('aaa00000-0000-0000-0000-000000000010', 'Tablelands Trading Co',        'Mick Nguyen',        'mick@tablelandstrading.com.au',    '0419 562 004', '23 456 789 012', 'agent')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. BOOKINGS
--    Statuses: confirmed | pending | changed | cancelled
--    HGP:      nil | implanted | under_withholding
--    Transport: arranged | pending | not_required
-- ─────────────────────────────────────────────────────────────

-- Shorthand variables (not actual SQL vars — just labelled for readability)
-- plant  = f47ac10b-58cc-4372-a567-0e02b2c3d479
-- sup_01 = Outback Pastoral Co
-- sup_02 = Murray Basin Cattle Co   (feedlot)
-- sup_03 = Riverina Livestock Agents
-- sup_04 = Macquarie Valley Pastoral
-- sup_05 = Hunter Valley Beef
-- sup_06 = Blue Mountains Feedlot
-- sup_07 = Central West Lamb Co
-- sup_08 = Namoi Valley Producers
-- sup_09 = Southern Highlands Pastoral
-- sup_10 = Tablelands Trading Co

INSERT INTO bookings (
  id, plant_id, supplier_id, species, species_class,
  head_count, status, requested_kill_date,
  slot_time, arrival_slot,
  hgp_status, transport_status,
  msa_enrolled, pericardium_ok,
  est_avg_live_wt, est_avg_hscw, days_on_feed,
  fill_rate, trucking_advice,
  created_at
) VALUES

-- ── TODAY  Friday 9 May 2026  (3 bookings, 780 head) ──────────────────────────
(
  'bbb00000-0000-0000-0000-000000000001',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  320, 'confirmed', '2026-05-09',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  558, 308, null,
  1.00, 'Via Mitchell Hwy — allow extra unload time, steep ramp at property',
  '2026-04-28 09:14:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000002',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000002',   -- Murray Basin Cattle (feedlot)
  'beef', 'Grain',
  280, 'confirmed', '2026-05-09',
  '08:00', '07:45',
  'under_withholding', 'arranged',
  false, true,
  612, 338, 100,
  1.00, 'Feedlot mob — NLIS tags scanned at gate, HGP WD cleared 2026-04-22',
  '2026-04-30 14:22:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000003',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000004',   -- Macquarie Valley Pastoral
  'beef', 'Grass',
  180, 'pending', '2026-05-09',
  '10:00', '09:45',
  'nil', 'pending',
  false, true,
  488, 270, null,
  null, 'Confirm truck arrival by 09:00 — property gate locked after that',
  '2026-05-06 11:07:00+10'
),

-- ── WEEK 1  Monday 12 May ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000004',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  350, 'confirmed', '2026-05-12',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  545, 302, null,
  1.00, null,
  '2026-04-25 08:30:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000005',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000005',   -- Hunter Valley Beef
  'beef', 'Grass',
  290, 'confirmed', '2026-05-12',
  '08:00', '07:45',
  'nil', 'arranged',
  true, true,
  502, 278, null,
  1.00, null,
  '2026-04-28 13:45:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000006',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000007',   -- Central West Lamb Co
  'lamb', 'Lamb',
  480, 'confirmed', '2026-05-12',
  '06:00', '05:45',
  'nil', 'arranged',
  false, false,
  52, 24, null,
  1.00, 'Split load — 3 B-doubles from Parkes depot',
  '2026-04-29 10:11:00+10'
),

-- ── WEEK 1  Tuesday 13 May ────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000007',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000002',   -- Murray Basin (feedlot)
  'beef', 'Grain',
  400, 'confirmed', '2026-05-13',
  '06:00', '05:45',
  'implanted', 'arranged',
  false, true,
  625, 344, 120,
  1.00, null,
  '2026-04-22 09:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000008',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000006',   -- Blue Mountains Feedlot
  'beef', 'Grain',
  380, 'confirmed', '2026-05-13',
  '08:00', '07:45',
  'implanted', 'arranged',
  false, true,
  598, 330, 90,
  1.00, null,
  '2026-04-24 14:30:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000009',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000008',   -- Namoi Valley (agent, sourcing lamb)
  'lamb', 'Lamb',
  320, 'pending', '2026-05-13',
  '06:30', '06:15',
  'nil', 'pending',
  false, false,
  48, 22, null,
  null, 'Agent sourcing from 3 separate runs — NVD to follow',
  '2026-05-07 16:20:00+10'
),

-- ── WEEK 1  Wednesday 14 May ──────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000010',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000003',   -- Riverina Agents
  'beef', 'MSA',
  310, 'confirmed', '2026-05-14',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  522, 289, null,
  1.00, null,
  '2026-04-30 09:55:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000011',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000004',   -- Macquarie Valley
  'beef', 'Grass',
  270, 'confirmed', '2026-05-14',
  '07:30', '07:15',
  'nil', 'arranged',
  false, true,
  479, 265, null,
  1.00, null,
  '2026-05-01 11:30:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000012',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000007',   -- Central West Lamb Co
  'sheep', 'Mutton',
  290, 'confirmed', '2026-05-14',
  '06:00', '05:45',
  'nil', 'arranged',
  false, false,
  61, 28, null,
  1.00, null,
  '2026-04-28 08:20:00+10'
),

-- ── WEEK 1  Thursday 15 May ───────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000013',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  420, 'confirmed', '2026-05-15',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  561, 310, null,
  1.00, null,
  '2026-04-26 10:10:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000014',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000005',   -- Hunter Valley Beef
  'beef', 'Grass',
  350, 'confirmed', '2026-05-15',
  '08:00', '07:45',
  'nil', 'arranged',
  true, true,
  514, 284, null,
  1.00, null,
  '2026-04-29 09:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000015',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000009',   -- Southern Highlands Pastoral
  'lamb', 'Lamb',
  510, 'pending', '2026-05-15',
  '06:00', '05:45',
  'nil', 'pending',
  false, false,
  50, 23, null,
  null, 'New supplier — confirm PIC and NLIS mob before despatch',
  '2026-05-06 13:45:00+10'
),

-- ── WEEK 1  Friday 16 May ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000016',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000002',   -- Murray Basin (feedlot)
  'beef', 'Grain',
  300, 'confirmed', '2026-05-16',
  '06:00', '05:45',
  'under_withholding', 'arranged',
  false, true,
  608, 335, 115,
  1.00, 'HGP withhold period confirmed clear 2026-05-01',
  '2026-04-25 14:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000017',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000010',   -- Tablelands Trading
  'beef', 'Grass',
  260, 'pending', '2026-05-16',
  '08:00', '07:45',
  'nil', 'pending',
  false, true,
  491, 272, null,
  null, null,
  '2026-05-07 09:30:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000018',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000007',   -- Central West Lamb Co
  'lamb', 'Lamb',
  280, 'confirmed', '2026-05-16',
  '06:00', '05:45',
  'nil', 'arranged',
  false, false,
  49, 23, null,
  1.00, null,
  '2026-04-29 11:00:00+10'
),

-- ── WEEK 2  Monday 19 May ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000019',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000003',   -- Riverina Agents
  'beef', 'MSA',
  380, 'confirmed', '2026-05-19',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  535, 297, null,
  1.00, null,
  '2026-05-02 09:45:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000020',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000007',   -- Central West Lamb Co
  'lamb', 'Lamb',
  420, 'confirmed', '2026-05-19',
  '06:00', '05:45',
  'nil', 'arranged',
  false, false,
  51, 24, null,
  1.00, null,
  '2026-05-01 08:00:00+10'
),

-- ── WEEK 2  Tuesday 20 May ────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000021',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000006',   -- Blue Mountains Feedlot
  'beef', 'Grain',
  420, 'confirmed', '2026-05-20',
  '06:00', '05:45',
  'implanted', 'arranged',
  false, true,
  618, 341, 105,
  1.00, null,
  '2026-04-29 10:30:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000022',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  310, 'pending', '2026-05-20',
  '08:30', '08:15',
  'nil', 'pending',
  true, true,
  549, 304, null,
  null, null,
  '2026-05-07 10:00:00+10'
),

-- ── WEEK 2  Wednesday 21 May ──────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000023',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000005',   -- Hunter Valley Beef
  'beef', 'Grass',
  290, 'confirmed', '2026-05-21',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  508, 281, null,
  1.00, null,
  '2026-05-02 14:20:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000024',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000008',   -- Namoi Valley
  'lamb', 'Lamb',
  350, 'pending', '2026-05-21',
  '06:30', '06:15',
  'nil', 'pending',
  false, false,
  47, 21, null,
  null, null,
  '2026-05-07 15:00:00+10'
),

-- ── WEEK 2  Thursday 22 May ───────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000025',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000002',   -- Murray Basin
  'beef', 'Grain',
  400, 'confirmed', '2026-05-22',
  '06:00', '05:45',
  'implanted', 'arranged',
  false, true,
  620, 342, 120,
  1.00, null,
  '2026-04-30 09:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000026',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000004',   -- Macquarie Valley
  'beef', 'Grass',
  280, 'confirmed', '2026-05-22',
  '08:00', '07:45',
  'nil', 'arranged',
  false, true,
  482, 267, null,
  1.00, null,
  '2026-05-02 11:00:00+10'
),

-- ── WEEK 2  Friday 23 May ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000027',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  350, 'confirmed', '2026-05-23',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  554, 307, null,
  1.00, null,
  '2026-05-01 08:45:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000028',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000009',   -- Southern Highlands
  'sheep', 'Mutton',
  260, 'pending', '2026-05-23',
  '06:00', '05:45',
  'nil', 'pending',
  false, false,
  63, 29, null,
  null, null,
  '2026-05-07 08:30:00+10'
),

-- ── WEEK 3  Monday 26 May ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000029',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000006',   -- Blue Mountains Feedlot
  'beef', 'Grain',
  430, 'confirmed', '2026-05-26',
  '06:00', '05:45',
  'implanted', 'arranged',
  false, true,
  615, 339, 95,
  1.00, null,
  '2026-05-02 09:15:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000030',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000007',   -- Central West Lamb Co
  'lamb', 'Lamb',
  460, 'pending', '2026-05-26',
  '06:00', '05:45',
  'nil', 'pending',
  false, false,
  53, 25, null,
  null, null,
  '2026-05-08 10:00:00+10'
),

-- ── WEEK 3  Tuesday 27 May ────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000031',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000005',   -- Hunter Valley Beef
  'beef', 'Grass',
  370, 'confirmed', '2026-05-27',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  518, 286, null,
  1.00, null,
  '2026-05-05 13:30:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000032',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000003',   -- Riverina Agents
  'beef', 'MSA',
  290, 'pending', '2026-05-27',
  '08:00', '07:45',
  'nil', 'pending',
  true, true,
  527, 292, null,
  null, null,
  '2026-05-08 09:00:00+10'
),

-- ── WEEK 3  Wednesday 28 May ──────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000033',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000002',   -- Murray Basin
  'beef', 'Grain',
  410, 'confirmed', '2026-05-28',
  '06:00', '05:45',
  'under_withholding', 'arranged',
  false, true,
  609, 336, 100,
  1.00, 'HGP withhold cleared by 2026-05-15 — confirm before despatch',
  '2026-05-01 10:30:00+10'
),

-- ── WEEK 3  Thursday 29 May ───────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000034',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  340, 'confirmed', '2026-05-29',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  543, 300, null,
  1.00, null,
  '2026-05-05 08:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000035',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000008',   -- Namoi Valley
  'lamb', 'Lamb',
  390, 'pending', '2026-05-29',
  '06:00', '05:45',
  'nil', 'pending',
  false, false,
  46, 21, null,
  null, null,
  '2026-05-08 14:00:00+10'
),

-- ── WEEK 3  Friday 30 May ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000036',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000004',   -- Macquarie Valley
  'beef', 'Grass',
  280, 'confirmed', '2026-05-30',
  '07:00', '06:45',
  'nil', 'arranged',
  false, true,
  475, 263, null,
  1.00, null,
  '2026-05-05 10:00:00+10'
),

-- ── WEEK 4  Monday 2 June ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000037',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000006',   -- Blue Mountains Feedlot
  'beef', 'Grain',
  450, 'pending', '2026-06-02',
  '06:00', '05:45',
  'implanted', 'pending',
  false, true,
  621, 343, 130,
  null, null,
  '2026-05-08 11:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000038',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000007',   -- Central West Lamb Co
  'lamb', 'Lamb',
  430, 'pending', '2026-06-02',
  '06:00', '05:45',
  'nil', 'pending',
  false, false,
  54, 25, null,
  null, null,
  '2026-05-09 07:30:00+10'
),

-- ── WEEK 4  Tuesday 3 June ────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000039',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000005',   -- Hunter Valley Beef
  'beef', 'Grass',
  380, 'confirmed', '2026-06-03',
  '06:00', '05:45',
  'nil', 'arranged',
  true, true,
  520, 288, null,
  1.00, null,
  '2026-05-06 09:30:00+10'
),

-- ── WEEK 4  Wednesday 4 June ──────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000040',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000002',   -- Murray Basin
  'beef', 'Grain',
  360, 'pending', '2026-06-04',
  '06:00', '05:45',
  'implanted', 'pending',
  false, true,
  614, 339, 110,
  null, null,
  '2026-05-08 13:00:00+10'
),

-- ── WEEK 4  Thursday 5 June ───────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000041',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000001',   -- Outback Pastoral
  'beef', 'MSA',
  310, 'pending', '2026-06-05',
  '06:00', '05:45',
  'nil', 'pending',
  true, true,
  541, 299, null,
  null, null,
  '2026-05-08 09:00:00+10'
),
(
  'bbb00000-0000-0000-0000-000000000042',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000009',   -- Southern Highlands
  'lamb', 'Lamb',
  370, 'pending', '2026-06-05',
  '06:00', '05:45',
  'nil', 'pending',
  false, false,
  49, 23, null,
  null, null,
  '2026-05-09 08:00:00+10'
),

-- ── WEEK 4  Friday 6 June ─────────────────────────────────────────────────────
(
  'bbb00000-0000-0000-0000-000000000043',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'aaa00000-0000-0000-0000-000000000003',   -- Riverina Agents
  'beef', 'MSA',
  280, 'pending', '2026-06-06',
  '06:00', '05:45',
  'nil', 'pending',
  true, true,
  529, 293, null,
  null, null,
  '2026-05-09 09:15:00+10'
)

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3. DAY PLANS  (capacity targets for each working day)
--    beef_cap: 1,200/day  |  lamb/sheep_cap: 600/day
-- ─────────────────────────────────────────────────────────────

INSERT INTO day_plans (id, plant_id, date, species, planned_head) VALUES
-- Today & Week 1 beef
  ('ddd00000-0001-0000-0000-000000000001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-09', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-12', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000003', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-13', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000004', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-14', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000005', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-15', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000006', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-16', 'beef', 1200),
-- Today & Week 1 lamb/sheep
  ('ddd00000-0001-0000-0000-000000000007', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-12', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000008', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-13', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000009', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-14', 'sheep', 600),
  ('ddd00000-0001-0000-0000-000000000010', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-15', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000011', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-16', 'lamb', 600),
-- Week 2
  ('ddd00000-0001-0000-0000-000000000012', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-19', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000013', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-19', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000014', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-20', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000015', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-21', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000016', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-21', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000017', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-22', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000018', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-23', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000019', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-23', 'sheep', 600),
-- Week 3
  ('ddd00000-0001-0000-0000-000000000020', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-26', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000021', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-26', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000022', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-27', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000023', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-28', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000024', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-29', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000025', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-29', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000026', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-30', 'beef', 1200),
-- Week 4
  ('ddd00000-0001-0000-0000-000000000027', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-02', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000028', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-02', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000029', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-03', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000030', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-04', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000031', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-05', 'beef', 1200),
  ('ddd00000-0001-0000-0000-000000000032', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-05', 'lamb', 600),
  ('ddd00000-0001-0000-0000-000000000033', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-06-06', 'beef', 1200)

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 4. KPI RECORDS  (past 20 working days — drives dashboard charts)
--    fill_rate_pct avg ~87.5%  |  slot_adherence avg ~92%
--    on_spec_pct avg ~93%      |  lead_time_variance ~+1.5 hr
-- ─────────────────────────────────────────────────────────────

INSERT INTO kpi_records (id, plant_id, date, fill_rate_pct, slot_adherence_pct, on_spec_pct, lead_time_variance_hr, rework_hours, changes_count) VALUES
  ('eee00000-0000-0000-0000-000000000001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-07', 88.5, 94.2, 95.1, 1.2, 1.0, 2),
  ('eee00000-0000-0000-0000-000000000002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-08', 82.3, 89.5, 91.8, 2.5, 2.5, 4),
  ('eee00000-0000-0000-0000-000000000003', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-09', 91.2, 96.0, 96.3, 0.8, 0.5, 1),
  ('eee00000-0000-0000-0000-000000000004', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-10', 85.7, 91.3, 93.5, 1.5, 1.5, 3),
  ('eee00000-0000-0000-0000-000000000005', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-11', 78.4, 87.2, 89.1, 3.2, 3.0, 5),
  ('eee00000-0000-0000-0000-000000000006', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-14', 92.0, 95.5, 96.8, 0.5, 0.5, 1),
  ('eee00000-0000-0000-0000-000000000007', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-15', 89.3, 93.8, 94.5, 1.0, 1.0, 2),
  ('eee00000-0000-0000-0000-000000000008', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-16', 86.1, 90.4, 92.7, 1.8, 1.5, 3),
  ('eee00000-0000-0000-0000-000000000009', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-17', 83.5, 88.9, 90.8, 2.1, 2.0, 4),
  ('eee00000-0000-0000-0000-000000000010', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-22', 90.8, 95.1, 95.9, 0.9, 0.8, 2),
  ('eee00000-0000-0000-0000-000000000011', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-23', 87.4, 92.6, 93.1, 1.3, 1.2, 2),
  ('eee00000-0000-0000-0000-000000000012', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-24', 84.2, 89.3, 91.4, 2.0, 1.8, 3),
  ('eee00000-0000-0000-0000-000000000013', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-28', 88.9, 93.7, 94.8, 1.1, 1.0, 2),
  ('eee00000-0000-0000-0000-000000000014', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-29', 93.5, 97.2, 97.5, 0.3, 0.3, 1),
  ('eee00000-0000-0000-0000-000000000015', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-04-30', 86.8, 91.0, 92.3, 1.6, 1.4, 3),
  ('eee00000-0000-0000-0000-000000000016', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-01', 84.6, 90.2, 91.9, 1.9, 1.7, 3),
  ('eee00000-0000-0000-0000-000000000017', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-02', 79.1, 86.4, 88.5, 3.4, 3.2, 6),
  ('eee00000-0000-0000-0000-000000000018', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-05', 91.7, 95.8, 96.1, 0.7, 0.6, 1),
  ('eee00000-0000-0000-0000-000000000019', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-06', 88.2, 92.9, 93.8, 1.2, 1.0, 2),
  ('eee00000-0000-0000-0000-000000000020', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-07', 85.9, 90.7, 92.0, 1.7, 1.5, 3),
  ('eee00000-0000-0000-0000-000000000021', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-05-08', 87.3, 91.8, 93.4, 1.4, 1.3, 2)

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 5. COMPLIANCE CHECKS  (for today's 2 confirmed bookings)
-- ─────────────────────────────────────────────────────────────

INSERT INTO compliance_checks (id, booking_id, nlis_status, nvd_status, pic_status, checked_at, checked_by) VALUES
  (
    'ccc00000-0000-0000-0000-000000000001',
    'bbb00000-0000-0000-0000-000000000001',  -- Outback Pastoral today
    'verified', 'received', 'valid',
    '2026-05-09 05:30:00+10',
    'Intake — Sam Reece'
  ),
  (
    'ccc00000-0000-0000-0000-000000000002',
    'bbb00000-0000-0000-0000-000000000002',  -- Murray Basin today
    'verified', 'received', 'valid',
    '2026-05-09 07:30:00+10',
    'Intake — Sam Reece'
  ),
  (
    'ccc00000-0000-0000-0000-000000000003',
    'bbb00000-0000-0000-0000-000000000004',  -- Outback Pastoral Mon 12
    'verified', 'received', 'valid',
    '2026-05-12 05:30:00+10',
    'Intake — Kelly Walsh'
  ),
  (
    'ccc00000-0000-0000-0000-000000000004',
    'bbb00000-0000-0000-0000-000000000007',  -- Murray Basin Tue 13
    'verified', 'received', 'valid',
    '2026-05-13 05:30:00+10',
    'Intake — Sam Reece'
  )
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. INTAKE EVENTS  (arrival & lairage for today's kills)
-- ─────────────────────────────────────────────────────────────

INSERT INTO intake_events (id, booking_id, event_type, location, notes, timestamp) VALUES
  (
    'fff00000-0000-0000-0000-000000000001',
    'bbb00000-0000-0000-0000-000000000001',
    'arrived',
    'Receiving bay 1',
    '320 head arrived on time. NLIS mob scan complete.',
    '2026-05-09 05:48:00+10'
  ),
  (
    'fff00000-0000-0000-0000-000000000002',
    'bbb00000-0000-0000-0000-000000000001',
    'lairaged',
    'Lairage pen A3',
    'Watered and lairaged. No injuries observed.',
    '2026-05-09 06:05:00+10'
  ),
  (
    'fff00000-0000-0000-0000-000000000003',
    'bbb00000-0000-0000-0000-000000000002',
    'arrived',
    'Receiving bay 2',
    '280 head arrived. Feedlot mob — NLIS verified against eNVD. HGP withholding confirmed clear.',
    '2026-05-09 07:52:00+10'
  ),
  (
    'fff00000-0000-0000-0000-000000000004',
    'bbb00000-0000-0000-0000-000000000002',
    'lairaged',
    'Lairage pen B1',
    'Lairaged and settled. Kill order 2.',
    '2026-05-09 08:10:00+10'
  )

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 7. PILOT PROJECTS
--    id is a serial integer — use explicit values
-- ─────────────────────────────────────────────────────────────

INSERT INTO pilots (id, processor_id, partner_name, funding_source, status, start_date) VALUES
  (
    1,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'MLA — Electronic NVD Rollout',
    'MLA Producer Levy Fund',
    'active',
    '2025-11-01'
  ),
  (
    2,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'NLIS Automated Reporting Integration',
    'Internal',
    'active',
    '2026-02-03'
  ),
  (
    3,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'MSA Grading Expansion — Lamb Program',
    'MLA MSA Program',
    'planning',
    '2026-06-01'
  ),
  (
    4,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'AI Liveweight Estimation Trial',
    'ARC Linkage Grant',
    'completed',
    '2025-07-14'
  )
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- DONE  ✓
-- Summary of inserted records:
--   plants:            1
--   suppliers:        10
--   bookings:         43  (today + 4 weeks)
--   day_plans:        33  (capacity rows)
--   kpi_records:      21  (20 working days of history)
--   compliance_checks: 4
--   intake_events:     4
--   pilots:            4
-- ─────────────────────────────────────────────────────────────
