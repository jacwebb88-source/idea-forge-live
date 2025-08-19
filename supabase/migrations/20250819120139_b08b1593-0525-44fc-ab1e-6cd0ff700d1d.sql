-- Enable Row Level Security on all public tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gridspecs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_events ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings table
CREATE POLICY "Authenticated users can view all bookings" 
ON public.bookings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert bookings" 
ON public.bookings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings" 
ON public.bookings 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bookings" 
ON public.bookings 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for suppliers table
CREATE POLICY "Authenticated users can view all suppliers" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert suppliers" 
ON public.suppliers 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers" 
ON public.suppliers 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete suppliers" 
ON public.suppliers 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for plants table
CREATE POLICY "Authenticated users can view all plants" 
ON public.plants 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert plants" 
ON public.plants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update plants" 
ON public.plants 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete plants" 
ON public.plants 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for gridspecs table
CREATE POLICY "Authenticated users can view all gridspecs" 
ON public.gridspecs 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert gridspecs" 
ON public.gridspecs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update gridspecs" 
ON public.gridspecs 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete gridspecs" 
ON public.gridspecs 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for kpi_records table
CREATE POLICY "Authenticated users can view all kpi_records" 
ON public.kpi_records 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert kpi_records" 
ON public.kpi_records 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update kpi_records" 
ON public.kpi_records 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete kpi_records" 
ON public.kpi_records 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Create policies for transport_slots table
CREATE POLICY "Authenticated users can view all transport_slots" 
ON public.transport_slots 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transport_slots" 
ON public.transport_slots 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transport_slots" 
ON public.transport_slots 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete transport_slots" 
ON public.transport_slots 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for slot_conflicts table
CREATE POLICY "Authenticated users can view all slot_conflicts" 
ON public.slot_conflicts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert slot_conflicts" 
ON public.slot_conflicts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update slot_conflicts" 
ON public.slot_conflicts 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete slot_conflicts" 
ON public.slot_conflicts 
FOR DELETE 
TO authenticated
USING (true);

-- Create policies for intake_events table
CREATE POLICY "Authenticated users can view all intake_events" 
ON public.intake_events 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert intake_events" 
ON public.intake_events 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update intake_events" 
ON public.intake_events 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete intake_events" 
ON public.intake_events 
FOR DELETE 
TO authenticated
USING (true);