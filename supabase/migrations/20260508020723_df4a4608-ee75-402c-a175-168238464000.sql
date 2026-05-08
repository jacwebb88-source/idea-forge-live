
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS arrival_slot text,
  ADD COLUMN IF NOT EXISTS hgp_status text,
  ADD COLUMN IF NOT EXISTS kill_order_seq integer,
  ADD COLUMN IF NOT EXISTS msa_enrolled boolean,
  ADD COLUMN IF NOT EXISTS pericardium_ok boolean,
  ADD COLUMN IF NOT EXISTS mulesing_status text,
  ADD COLUMN IF NOT EXISTS species_class text,
  ADD COLUMN IF NOT EXISTS exit_followup_status text;

CREATE TABLE IF NOT EXISTS public.booking_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by text,
  changed_by_role text,
  change_note text,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_changes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "read_booking_changes" ON public.booking_changes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "insert_booking_changes" ON public.booking_changes FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
