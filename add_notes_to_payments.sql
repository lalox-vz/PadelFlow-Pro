-- Add notes column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS notes TEXT;
