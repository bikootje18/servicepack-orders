-- Sequence for invoice numbers per year
CREATE SEQUENCE factuur_nummer_seq START 1;

-- Function to generate factuur_nummer atomically
CREATE OR REPLACE FUNCTION generate_factuur_nummer()
RETURNS text AS $$
DECLARE
  jaar text := to_char(CURRENT_DATE, 'YYYY');
  volgnummer text;
BEGIN
  volgnummer := lpad(nextval('factuur_nummer_seq')::text, 4, '0');
  RETURN jaar || '-' || volgnummer;
END;
$$ LANGUAGE plpgsql;
