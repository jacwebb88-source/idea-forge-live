
-- Allow UPDATE on bookings for the default plant so Kill Board / Booking Board edits persist
CREATE POLICY "update_default_plant_bookings"
ON public.bookings
FOR UPDATE
USING (EXISTS (SELECT 1 FROM plants p WHERE p.id = bookings.plant_id AND p.is_default IS TRUE))
WITH CHECK (EXISTS (SELECT 1 FROM plants p WHERE p.id = bookings.plant_id AND p.is_default IS TRUE));

-- Seed 5 realistic mock change history entries for demo mode
INSERT INTO public.booking_changes (booking_id, field_name, old_value, new_value, change_note, changed_by, changed_by_role, changed_at) VALUES
('f60171f5-fa3e-4c57-82d0-28c5d1399067', 'head_count', '240', '180', 'Supplier short on weight-ready cattle this week', 'Sarah Mitchell', 'Supplier', now() - interval '45 minutes'),
('9462aaa3-b37a-4706-a444-79bb7bea5423', 'requested_kill_date', '2026-05-12', '2026-05-14', 'Buyer moved booking to Thursday — transport conflict Tuesday', 'James OConnor', 'Buyer', now() - interval '2 hours'),
('e59f3fa5-1977-4178-b955-9fe23d0a60d0', 'nvd_status', 'pending', 'ok', 'eNVD received from agent, all consignment IDs verified', 'Tom Reilly', 'Compliance', now() - interval '4 hours'),
('01d3a044-7586-497e-8b3b-880d8eaf0df2', 'transport_status', 'pending', 'confirmed', 'Frasers Livestock Transport confirmed 4 decks for Friday lift', 'Linda Chen', 'Transport', now() - interval '6 hours'),
('a1bd6dc4-20d4-4883-a614-2c5bbec6a519', 'status', 'requested', 'confirmed', 'Livestock readiness confirmed by feedlot manager', 'Mike Patterson', 'Processor', now() - interval '1 day');
