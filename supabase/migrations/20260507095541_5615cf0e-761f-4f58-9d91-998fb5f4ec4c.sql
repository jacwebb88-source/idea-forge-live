
-- Enable RLS on tables missing it; add public read policies (app has no auth yet, matches existing pattern)
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_pilots" ON public.pilots FOR SELECT USING (true);

ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_compliance_checks" ON public.compliance_checks FOR SELECT USING (true);

ALTER TABLE public."Compliance_checks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_Compliance_checks" ON public."Compliance_checks" FOR SELECT USING (true);

-- Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.get_avg_fill_rate(start_date date, end_date date, plant_filter uuid DEFAULT NULL::uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $function$
  SELECT COALESCE(AVG(fill_rate), 0)
  FROM public.bookings
  WHERE requested_kill_date >= start_date
    AND requested_kill_date <= end_date
    AND (plant_filter IS NULL OR plant_id = plant_filter);
$function$;

CREATE OR REPLACE FUNCTION public.insert_compliance_check()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
  INSERT INTO public.compliance_checks (booking_id, nlis_status, nvd_status, pic_status, checked_by)
  VALUES (NEW.id, 'pending', 'pending', 'pending', 'system');
  RETURN NEW;
END;
$function$;
