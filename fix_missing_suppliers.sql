-- Fix: Insert the 8 enterprise suppliers that failed due to 'producer' type (not valid)
-- Valid types are: agent, farmer, feedlot
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard/project/kzgdpzdztktfchbvivhg/editor

INSERT INTO suppliers (id, name, contact_name, email, phone, abn, type)
VALUES
  ('e1000000-0000-0000-0000-000000000002', 'Northern Pastoral Group',     'Wayne Hollis',    'wayne@northernpastoral.com.au',  '0408 222 002', '22 333 444 555', 'farmer'),
  ('e1000000-0000-0000-0000-000000000004', 'Condamine Plains Beef',       'Steve Donoghue',  'steve@condamineplains.com.au',   '0439 444 004', '44 555 666 777', 'farmer'),
  ('e1000000-0000-0000-0000-000000000005', 'Maranoa Pastoral Co',         'Robyn McGregor',  'robyn@maranoopastoral.com.au',   '0411 555 005', '55 666 777 888', 'farmer'),
  ('e1000000-0000-0000-0000-000000000007', 'Western Downs Lamb Co',       'Fiona Burgess',   'fiona@wdlamb.com.au',            '0417 777 007', '77 888 999 000', 'farmer'),
  ('e1000000-0000-0000-0000-000000000009', 'Balonne River Pastoral',      'Lee Forsythe',    'lee@balonneriver.com.au',        '0435 999 009', '99 000 111 222', 'farmer'),
  ('e1000000-0000-0000-0000-000000000012', 'Brigalow Beef Co',            'Trish Hammond',   'trish@brigalowbeef.com.au',      '0411 222 012', '22 333 555 666', 'farmer'),
  ('e1000000-0000-0000-0000-000000000013', 'Central Queensland Agistment','Sandra Park',     'sandra@cqagist.com.au',          '0412 333 013', '33 444 666 777', 'farmer'),
  ('e1000000-0000-0000-0000-000000000015', 'Chinchilla Pastoral Group',   'Bruce McLean',    'bruce@chinchillapastoral.com.au','0427 555 015', '55 666 888 999', 'farmer')
ON CONFLICT (id) DO NOTHING;

-- Verify: should return 15 rows when done
SELECT id, name, type FROM suppliers WHERE id LIKE 'e1000000%' ORDER BY id;
