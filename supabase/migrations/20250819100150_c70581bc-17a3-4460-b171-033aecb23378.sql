-- Create slot_conflicts table for transport slot conflict information
CREATE TABLE public.slot_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES transport_slots(id) ON DELETE CASCADE,
  assigned_loads INTEGER NOT NULL DEFAULT 0,
  max_loads INTEGER NOT NULL DEFAULT 1,
  is_conflict BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.slot_conflicts ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Allow read access to slot_conflicts" 
ON public.slot_conflicts 
FOR SELECT 
USING (true);

-- Create unique constraint to prevent duplicate conflicts for same slot
CREATE UNIQUE INDEX idx_slot_conflicts_unique ON public.slot_conflicts (slot_id);

-- Create indexes for better performance
CREATE INDEX idx_slot_conflicts_slot_id ON public.slot_conflicts (slot_id);
CREATE INDEX idx_slot_conflicts_is_conflict ON public.slot_conflicts (is_conflict);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_slot_conflicts_updated_at
  BEFORE UPDATE ON public.slot_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample conflict data for existing transport slots
INSERT INTO public.slot_conflicts (slot_id, assigned_loads, max_loads, is_conflict)
SELECT 
  id as slot_id,
  COALESCE(array_length(assigned_booking_ids, 1), 0) as assigned_loads,
  COALESCE(max_truck_loads, 1) as max_loads,
  CASE 
    WHEN COALESCE(array_length(assigned_booking_ids, 1), 0) > COALESCE(max_truck_loads, 1) THEN true
    ELSE false
  END as is_conflict
FROM transport_slots;