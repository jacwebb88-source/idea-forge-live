-- Create enums
CREATE TYPE public.species_type AS ENUM ('beef', 'lamb', 'mutton', 'goat');
CREATE TYPE public.licence_type AS ENUM ('export', 'domestic');
CREATE TYPE public.supplier_type AS ENUM ('agent', 'farmer');
CREATE TYPE public.booking_status AS ENUM ('requested', 'confirmed', 'changed', 'cancelled');
CREATE TYPE public.user_role AS ENUM ('processor_ops', 'transport', 'agent', 'admin');
CREATE TYPE public.intake_event_type AS ENUM ('yarded', 'loaded', 'eta', 'gate_in', 'gate_out');

-- Plants table
CREATE TABLE public.plants (
    plant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    plant_name TEXT NOT NULL,
    state TEXT NOT NULL,
    species_supported species_type[] NOT NULL,
    licence_type licence_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Suppliers table
CREATE TABLE public.suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type supplier_type NOT NULL,
    name TEXT NOT NULL,
    abn_optional TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grid specifications (versioned)
CREATE TABLE public.grid_specs (
    grid_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES public.plants(plant_id) ON DELETE CASCADE,
    species species_type NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    effective_from DATE NOT NULL,
    effective_to DATE,
    min_hscw DECIMAL(6,2) NOT NULL,
    max_hscw DECIMAL(6,2) NOT NULL,
    fat_code TEXT,
    dentition_or_age TEXT,
    yield_adj_rules JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(plant_id, species, version)
);

-- Bookings table
CREATE TABLE public.bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES public.plants(plant_id) ON DELETE CASCADE,
    species species_type NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(supplier_id) ON DELETE CASCADE,
    agent_ref TEXT,
    lot_id TEXT NOT NULL,
    head_count INTEGER NOT NULL CHECK (head_count > 0),
    est_avg_live_wt DECIMAL(6,2),
    est_avg_hscw DECIMAL(6,2),
    target_grid_id UUID REFERENCES public.grid_specs(grid_id),
    requested_kill_date DATE NOT NULL,
    requested_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status booking_status NOT NULL DEFAULT 'requested',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CHECK (requested_window_end > requested_window_start)
);

-- Transport slots table
CREATE TABLE public.transport_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES public.plants(plant_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    window_start_dt TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end_dt TIMESTAMP WITH TIME ZONE NOT NULL,
    species species_type NOT NULL,
    max_truck_loads INTEGER NOT NULL DEFAULT 1,
    assigned_booking_ids UUID[],
    conflict_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CHECK (window_end_dt > window_start_dt)
);

-- Intake events table
CREATE TABLE public.intake_events (
    intake_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
    event_type intake_event_type NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- KPI records table
CREATE TABLE public.kpi_records (
    kpi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES public.plants(plant_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    fill_rate_pct DECIMAL(5,2),
    lead_time_variance_hr DECIMAL(8,2),
    changes_count INTEGER DEFAULT 0,
    rework_hours DECIMAL(8,2),
    slot_adherence_pct DECIMAL(5,2),
    on_spec_pct DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(plant_id, date)
);

-- Users table (extends auth.users)
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    plants UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit log table
CREATE TABLE public.audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_plants_state ON public.plants(state);
CREATE INDEX idx_bookings_plant_date ON public.bookings(plant_id, requested_kill_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_transport_slots_plant_date ON public.transport_slots(plant_id, date);
CREATE INDEX idx_grid_specs_plant_species ON public.grid_specs(plant_id, species);
CREATE INDEX idx_intake_events_booking ON public.intake_events(booking_id);
CREATE INDEX idx_kpi_records_plant_date ON public.kpi_records(plant_id, date);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp);

-- Enable RLS on all tables
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grid_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Allow authenticated users to read plants" ON public.plants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read grid_specs" ON public.grid_specs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read transport_slots" ON public.transport_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read intake_events" ON public.intake_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read kpi_records" ON public.kpi_records FOR SELECT TO authenticated USING (true);

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Audit log - read only for authenticated users
CREATE POLICY "Authenticated users can read audit log" ON public.audit_log FOR SELECT TO authenticated USING (true);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, role, name, email)
  VALUES (
    NEW.id,
    'agent'::user_role,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for timestamp columns
CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grid_specs_updated_at BEFORE UPDATE ON public.grid_specs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transport_slots_updated_at BEFORE UPDATE ON public.transport_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();