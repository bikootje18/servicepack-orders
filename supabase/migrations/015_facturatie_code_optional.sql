-- Facturatiecode optioneel maken op orders
ALTER TABLE orders ALTER COLUMN facturatie_code_id DROP NOT NULL;
