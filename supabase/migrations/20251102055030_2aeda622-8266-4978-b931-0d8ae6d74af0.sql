-- Create function to calculate average fill rate
CREATE OR REPLACE FUNCTION get_avg_fill_rate(
  start_date DATE,
  end_date DATE,
  plant_filter UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(AVG(fill_rate), 0)
  FROM public.bookings
  WHERE requested_kill_date >= start_date
    AND requested_kill_date <= end_date
    AND (plant_filter IS NULL OR plant_id = plant_filter);
$$;