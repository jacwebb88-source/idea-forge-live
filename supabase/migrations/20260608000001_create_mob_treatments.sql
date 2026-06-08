CREATE TABLE IF NOT EXISTS public.mob_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mob_id uuid NOT NULL REFERENCES public.mobs(id) ON DELETE CASCADE,
  treatment_date date NOT NULL,
  treatment_type text NOT NULL CHECK (treatment_type IN ('antibiotic','vaccine','parasite','vitamin','other')),
  product_name text NOT NULL,
  active_ingredient text,
  dose_ml_per_head numeric,
  head_count_treated integer NOT NULL,
  whp_days integer NOT NULL DEFAULT 0,
  esi_days integer NOT NULL DEFAULT 0,
  clearance_date_domestic date GENERATED ALWAYS AS (treatment_date + whp_days * interval '1 day')::date STORED,
  clearance_date_export date GENERATED ALWAYS AS (treatment_date + esi_days * interval '1 day')::date STORED,
  treated_by text,
  vet_name text,
  batch_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mob_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage treatments"
ON public.mob_treatments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
