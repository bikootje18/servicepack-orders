-- Per welke eenheid het tarief van een facturatie code geldt,
-- bijv. 'per fles', 'per 6', 'per doos'. Vrije tekst.
ALTER TABLE facturatie_codes
  ADD COLUMN eenheid text NOT NULL DEFAULT 'per stuk';
