-- Dagelijkse teller voor vrachtbrief nummering (SP-DDMMYY-NN)
CREATE TABLE vrachtbrief_tellers (
  datum date PRIMARY KEY,
  teller int NOT NULL DEFAULT 0
);

ALTER TABLE vrachtbrief_tellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything on vrachtbrief_tellers"
  ON vrachtbrief_tellers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bijgewerkte functie: SP-DDMMYY-NN, dagelijkse reset, atomisch
CREATE OR REPLACE FUNCTION generate_vrachtbrief_nummer()
RETURNS text AS $$
DECLARE
  d date := CURRENT_DATE;
  dag text := to_char(d, 'DDMMYY');
  volgnummer int;
BEGIN
  INSERT INTO vrachtbrief_tellers(datum, teller)
  VALUES (d, 1)
  ON CONFLICT (datum) DO UPDATE
    SET teller = vrachtbrief_tellers.teller + 1
  RETURNING teller INTO volgnummer;
  RETURN 'SP-' || dag || '-' || lpad(volgnummer::text, 2, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wie heeft de vracht aangemaakt
ALTER TABLE vrachten ADD COLUMN aangemaakt_door text;
