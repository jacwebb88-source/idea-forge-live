-- Add feedlot and producer to the supplier_type enum
ALTER TYPE public.supplier_type ADD VALUE IF NOT EXISTS 'feedlot';
ALTER TYPE public.supplier_type ADD VALUE IF NOT EXISTS 'producer';
