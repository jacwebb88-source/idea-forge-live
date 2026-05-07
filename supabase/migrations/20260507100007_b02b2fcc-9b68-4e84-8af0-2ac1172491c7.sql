
DO $$
DECLARE
  v_plant uuid := '148e4475-1468-4209-ba23-59d5b2707d70';
BEGIN
  DELETE FROM public.compliance_checks
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE plant_id = v_plant
      AND requested_kill_date BETWEEN '2026-05-04' AND '2026-05-10'
  );

  DELETE FROM public.bookings
  WHERE plant_id = v_plant
    AND requested_kill_date BETWEEN '2026-05-04' AND '2026-05-10';

  DELETE FROM public.day_plans
  WHERE plant_id = v_plant
    AND date BETWEEN '2026-05-04' AND '2026-05-10';

  INSERT INTO public.suppliers (name, type)
  SELECT n, 'farmer' FROM (VALUES
    ('Smithfield Feedlot'),('Murray Plains Pastoral'),('Darling Downs Beef'),
    ('Riverina Lamb Co'),('High Country Pastoral'),('Warwick Feedlot'),
    ('Southern Cross Beef'),('Blue Ribbon Lamb'),('Murray Valley Sheep'),
    ('Goulburn Valley Pastoral'),('Southern Highlands Sheep')
  ) AS s(n)
  WHERE NOT EXISTS (SELECT 1 FROM public.suppliers x WHERE x.name = s.n);

  INSERT INTO public.day_plans (plant_id, date, species, planned_head)
  SELECT v_plant, d::date, sp.species, sp.head
  FROM generate_series('2026-05-04'::date, '2026-05-08'::date, '1 day') d
  CROSS JOIN (VALUES ('cattle', 2500), ('sheep', 3500)) AS sp(species, head);

  INSERT INTO public.bookings (plant_id, supplier_id, requested_kill_date, species, head_count, status)
  SELECT v_plant, s.id, b.kdate, b.species, b.head, b.status
  FROM (VALUES
    ('Smithfield Feedlot',       '2026-05-04'::date, 'cattle', 800, 'confirmed'),
    ('Murray Plains Pastoral',   '2026-05-04'::date, 'cattle', 600, 'confirmed'),
    ('Darling Downs Beef',       '2026-05-04'::date, 'cattle', 450, 'placeholder'),
    ('Riverina Lamb Co',         '2026-05-04'::date, 'sheep', 1200, 'confirmed'),
    ('High Country Pastoral',    '2026-05-04'::date, 'sheep',  800, 'confirmed'),
    ('Smithfield Feedlot',       '2026-05-05'::date, 'cattle', 750, 'confirmed'),
    ('Warwick Feedlot',          '2026-05-05'::date, 'cattle', 500, 'confirmed'),
    ('Southern Cross Beef',      '2026-05-05'::date, 'cattle', 400, 'placeholder'),
    ('Blue Ribbon Lamb',         '2026-05-05'::date, 'sheep', 1400, 'confirmed'),
    ('Murray Valley Sheep',      '2026-05-05'::date, 'sheep',  900, 'placeholder'),
    ('Darling Downs Beef',       '2026-05-06'::date, 'cattle', 900, 'confirmed'),
    ('Murray Plains Pastoral',   '2026-05-06'::date, 'cattle', 700, 'confirmed'),
    ('Riverina Lamb Co',         '2026-05-06'::date, 'sheep', 1600, 'confirmed'),
    ('Goulburn Valley Pastoral', '2026-05-06'::date, 'sheep',  600, 'confirmed'),
    ('High Country Pastoral',    '2026-05-06'::date, 'sheep',  500, 'placeholder'),
    ('Smithfield Feedlot',       '2026-05-07'::date, 'cattle', 850, 'confirmed'),
    ('Warwick Feedlot',          '2026-05-07'::date, 'cattle', 600, 'placeholder'),
    ('Blue Ribbon Lamb',         '2026-05-07'::date, 'sheep', 1500, 'confirmed'),
    ('Southern Highlands Sheep', '2026-05-07'::date, 'sheep',  800, 'confirmed'),
    ('Murray Plains Pastoral',   '2026-05-08'::date, 'cattle', 750, 'confirmed'),
    ('Darling Downs Beef',       '2026-05-08'::date, 'cattle', 500, 'placeholder'),
    ('Riverina Lamb Co',         '2026-05-08'::date, 'sheep', 1800, 'confirmed'),
    ('Murray Valley Sheep',      '2026-05-08'::date, 'sheep',  700, 'placeholder')
  ) AS b(supplier_name, kdate, species, head, status)
  JOIN public.suppliers s ON s.name = b.supplier_name;
END $$;
