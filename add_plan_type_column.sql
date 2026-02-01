-- Add plan_type column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_type text;
