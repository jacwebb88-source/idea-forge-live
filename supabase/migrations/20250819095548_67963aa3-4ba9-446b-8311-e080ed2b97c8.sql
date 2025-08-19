-- Create day_plans table for planned head counts by date and species
CREATE TABLE public.day_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES plants(id),
  date DATE NOT NULL,
  species TEXT NOT NULL,
  planned_head INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for access (for now, allow all read access)
CREATE POLICY "Allow read access to day_plans" 
ON public.day_plans 
FOR SELECT 
USING (true);

-- Create unique constraint to prevent duplicate plans for same plant/date/species
CREATE UNIQUE INDEX idx_day_plans_unique ON public.day_plans (plant_id, date, species);

-- Create index for better performance
CREATE INDEX idx_day_plans_date ON public.day_plans (date);
CREATE INDEX idx_day_plans_plant_id ON public.day_plans (plant_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_day_plans_updated_at
  BEFORE UPDATE ON public.day_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.day_plans (plant_id, date, species, planned_head) 
SELECT 
  p.id,
  CURRENT_DATE + (interval '1 day' * generate_series(-14, 7)),
  unnest(ARRAY['Cattle', 'Sheep', 'Pig']) as species,
  floor(random() * 100 + 50)::integer as planned_head
FROM plants p
WHERE p.plant_name IN ('JBS - Dinmore (test)', 'Teys - Beenleigh (test)', 'NH Foods - Oakey (test)');