
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status = ANY (ARRAY['requested','confirmed','changed','cancelled','placeholder','pending']));

INSERT INTO public.suppliers (id, name, type) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Smithfield Feedlot', 'farmer'),
  ('11111111-1111-1111-1111-111111111102', 'Murray Plains', 'farmer'),
  ('11111111-1111-1111-1111-111111111103', 'Riverina Lamb Co', 'farmer'),
  ('11111111-1111-1111-1111-111111111104', 'High Country Pastoral', 'farmer'),
  ('11111111-1111-1111-1111-111111111105', 'Darling Downs', 'farmer');

INSERT INTO public.bookings (species, head_count, requested_kill_date, status, supplier_id, plant_id) VALUES
  ('cattle', 180, '2026-05-04', 'confirmed',  '11111111-1111-1111-1111-111111111101', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('cattle', 120, '2026-05-04', 'placeholder','11111111-1111-1111-1111-111111111102', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('sheep',  400, '2026-05-05', 'confirmed',  '11111111-1111-1111-1111-111111111103', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('sheep',  220, '2026-05-05', 'confirmed',  '11111111-1111-1111-1111-111111111104', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('cattle', 200, '2026-05-06', 'confirmed',  '11111111-1111-1111-1111-111111111101', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('cattle', 150, '2026-05-06', 'placeholder','11111111-1111-1111-1111-111111111105', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('cattle', 180, '2026-05-07', 'confirmed',  '11111111-1111-1111-1111-111111111102', '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('sheep',  350, '2026-05-08', 'placeholder','11111111-1111-1111-1111-111111111103', '148e4475-1468-4209-ba23-59d5b2707d70');

INSERT INTO public.day_plans (date, species, planned_head, plant_id) VALUES
  ('2026-05-04', 'cattle', 400, '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('2026-05-05', 'sheep',  700, '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('2026-05-06', 'cattle', 400, '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('2026-05-07', 'cattle', 400, '148e4475-1468-4209-ba23-59d5b2707d70'),
  ('2026-05-08', 'sheep',  700, '148e4475-1468-4209-ba23-59d5b2707d70');
