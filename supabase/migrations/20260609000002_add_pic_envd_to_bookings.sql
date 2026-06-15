-- Add dedicated PIC and eNVD reference columns to bookings.
-- Previously these were stuffed into agent_ref as a workaround (see NewBookingForm.tsx TODO).
alter table bookings
  add column if not exists pic_numbers text,
  add column if not exists envd_ref text;
