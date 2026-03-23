-- Sequence and function for vrachtbrief numbers (VB-YYYY-NNNN format)
CREATE SEQUENCE vrachtbrief_nummer_seq START 1;

CREATE OR REPLACE FUNCTION generate_vrachtbrief_nummer()
RETURNS text AS $$
DECLARE
  jaar text := to_char(CURRENT_DATE, 'YYYY');
  volgnummer text;
BEGIN
  volgnummer := lpad(nextval('vrachtbrief_nummer_seq')::text, 4, '0');
  RETURN 'VB-' || jaar || '-' || volgnummer;
END;
$$ LANGUAGE plpgsql;

-- Vrachten (one vracht = one physical shipment event)
CREATE TABLE vrachten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id uuid NOT NULL REFERENCES klanten(id),
  vrachtbrief_nummer text NOT NULL UNIQUE DEFAULT generate_vrachtbrief_nummer(),
  datum date NOT NULL DEFAULT CURRENT_DATE,
  notities text NOT NULL DEFAULT '',
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- vracht_regels: links individual leveringen to a vracht
-- A levering can only belong to one vracht (UNIQUE on levering_id)
CREATE TABLE vracht_regels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vracht_id uuid NOT NULL REFERENCES vrachten(id) ON DELETE CASCADE,
  levering_id uuid NOT NULL REFERENCES leveringen(id),
  UNIQUE(levering_id)
);

-- Extend facturen to support vracht-based invoices
-- order_id becomes nullable (null for vracht facturen that span multiple orders)
-- tarief becomes nullable (null for vracht facturen with mixed tarifeven)
-- vracht_id links to the vracht this factuur was created from
ALTER TABLE facturen ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE facturen ALTER COLUMN tarief DROP NOT NULL;
ALTER TABLE facturen ADD COLUMN vracht_id uuid REFERENCES vrachten(id);

-- RLS for new tables
ALTER TABLE vrachten ENABLE ROW LEVEL SECURITY;
ALTER TABLE vracht_regels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything on vrachten"
  ON vrachten FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on vracht_regels"
  ON vracht_regels FOR ALL TO authenticated USING (true) WITH CHECK (true);
