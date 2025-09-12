-- Add more sample booking data for large processor calendar view
INSERT INTO bookings (
  plant_id, 
  species, 
  head_count, 
  requested_kill_date, 
  requested_window_start, 
  requested_window_end, 
  status, 
  lot_id, 
  agent_ref,
  est_avg_hscw,
  est_avg_live_wt
) VALUES 
-- Next week's bookings for large processor
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 150, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days' + TIME '06:00', CURRENT_DATE + INTERVAL '7 days' + TIME '09:00', 'confirmed', 'LP001', 'AG-2024-001', 320.5, 550.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 120, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days' + TIME '09:30', CURRENT_DATE + INTERVAL '7 days' + TIME '12:30', 'confirmed', 'LP002', 'AG-2024-002', 315.0, 545.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'lamb', 300, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days' + TIME '13:00', CURRENT_DATE + INTERVAL '7 days' + TIME '16:00', 'confirmed', 'LP003', 'AG-2024-003', 22.5, 45.0),

-- Next day bookings
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 200, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day' + TIME '05:30', CURRENT_DATE + INTERVAL '1 day' + TIME '08:30', 'confirmed', 'LP004', 'AG-2024-004', 325.0, 560.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 180, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day' + TIME '09:00', CURRENT_DATE + INTERVAL '1 day' + TIME '12:00', 'confirmed', 'LP005', 'AG-2024-005', 318.0, 552.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'lamb', 400, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day' + TIME '12:30', CURRENT_DATE + INTERVAL '1 day' + TIME '15:30', 'requested', 'LP006', 'AG-2024-006', 23.0, 46.0),

-- Day after tomorrow
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 175, CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days' + TIME '06:00', CURRENT_DATE + INTERVAL '2 days' + TIME '09:00', 'confirmed', 'LP007', 'AG-2024-007', 322.0, 558.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'mutton', 80, CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days' + TIME '09:30', CURRENT_DATE + INTERVAL '2 days' + TIME '11:30', 'requested', 'LP008', 'AG-2024-008', 28.5, 55.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 160, CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days' + TIME '13:00', CURRENT_DATE + INTERVAL '2 days' + TIME '16:00', 'confirmed', 'LP009', 'AG-2024-009', 319.0, 550.0),

-- Three days ahead
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 190, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days' + TIME '05:45', CURRENT_DATE + INTERVAL '3 days' + TIME '08:45', 'requested', 'LP010', 'AG-2024-010', 324.0, 562.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'lamb', 350, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days' + TIME '09:15', CURRENT_DATE + INTERVAL '3 days' + TIME '12:15', 'confirmed', 'LP011', 'AG-2024-011', 22.8, 44.5),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 140, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days' + TIME '13:30', CURRENT_DATE + INTERVAL '3 days' + TIME '16:30', 'confirmed', 'LP012', 'AG-2024-012', 316.5, 548.0),

-- Four days ahead
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 210, CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '4 days' + TIME '06:15', CURRENT_DATE + INTERVAL '4 days' + TIME '09:15', 'confirmed', 'LP013', 'AG-2024-013', 327.0, 565.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'goat', 50, CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '4 days' + TIME '10:00', CURRENT_DATE + INTERVAL '4 days' + TIME '12:00', 'requested', 'LP014', 'AG-2024-014', 18.5, 35.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 165, CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '4 days' + TIME '14:00', CURRENT_DATE + INTERVAL '4 days' + TIME '17:00', 'confirmed', 'LP015', 'AG-2024-015', 320.0, 555.0),

-- Five days ahead
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 185, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days' + TIME '05:30', CURRENT_DATE + INTERVAL '5 days' + TIME '08:30', 'requested', 'LP016', 'AG-2024-016', 323.5, 559.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'lamb', 280, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days' + TIME '09:00', CURRENT_DATE + INTERVAL '5 days' + TIME '12:00', 'confirmed', 'LP017', 'AG-2024-017', 23.2, 45.5),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 155, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days' + TIME '13:15', CURRENT_DATE + INTERVAL '5 days' + TIME '16:15', 'confirmed', 'LP018', 'AG-2024-018', 318.5, 551.0),

-- Six days ahead
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'beef', 195, CURRENT_DATE + INTERVAL '6 days', CURRENT_DATE + INTERVAL '6 days' + TIME '06:00', CURRENT_DATE + INTERVAL '6 days' + TIME '09:00', 'confirmed', 'LP019', 'AG-2024-019', 326.0, 563.0),
((SELECT id FROM plants WHERE is_default = true LIMIT 1), 'mutton', 90, CURRENT_DATE + INTERVAL '6 days', CURRENT_DATE + INTERVAL '6 days' + TIME '09:45', CURRENT_DATE + INTERVAL '6 days' + TIME '11:45', 'requested', 'LP020', 'AG-2024-020', 29.0, 56.0);

-- Also add some supplier entries to ensure data consistency
INSERT INTO suppliers (name, type, contact_name, phone, email, abn) VALUES
('Australian Beef Producers', 'producer', 'John Smith', '+61 2 9876 5432', 'john@abp.com.au', '12345678901'),
('Premium Livestock Co', 'producer', 'Sarah Johnson', '+61 3 8765 4321', 'sarah@plc.com.au', '23456789012'),
('Regional Cattle Group', 'producer', 'Mike Wilson', '+61 7 7654 3210', 'mike@rcg.com.au', '34567890123'),
('Heritage Farms Alliance', 'producer', 'Emma Davis', '+61 8 6543 2109', 'emma@hfa.com.au', '45678901234'),
('Quality Meat Suppliers', 'producer', 'David Brown', '+61 4 5432 1098', 'david@qms.com.au', '56789012345');

-- Update some bookings to link to suppliers
UPDATE bookings 
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Australian Beef Producers' LIMIT 1)
WHERE lot_id IN ('LP001', 'LP004', 'LP007', 'LP010', 'LP013');

UPDATE bookings 
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Premium Livestock Co' LIMIT 1)
WHERE lot_id IN ('LP002', 'LP005', 'LP008', 'LP011', 'LP014');

UPDATE bookings 
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Regional Cattle Group' LIMIT 1)
WHERE lot_id IN ('LP003', 'LP006', 'LP009', 'LP012', 'LP015');

UPDATE bookings 
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Heritage Farms Alliance' LIMIT 1)
WHERE lot_id IN ('LP016', 'LP017', 'LP018');

UPDATE bookings 
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Quality Meat Suppliers' LIMIT 1)
WHERE lot_id IN ('LP019', 'LP020');