-- 1. Create Sequence
CREATE SEQUENCE IF NOT EXISTS payment_invoice_seq;

-- 2. Add Columns
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- 3. Function to generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    seq_part TEXT;
BEGIN
    -- Only generate if not already set (allows manual overrides if ever needed)
    IF NEW.invoice_number IS NULL THEN
        year_part := to_char(CURRENT_DATE, 'YYYY');
        seq_part := lpad(nextval('payment_invoice_seq')::text, 5, '0');
        NEW.invoice_number := 'OLY-' || year_part || '-' || seq_part;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger
DROP TRIGGER IF EXISTS set_invoice_number_trigger ON payments;
CREATE TRIGGER set_invoice_number_trigger
BEFORE INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION generate_invoice_number();
