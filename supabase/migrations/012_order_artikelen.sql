-- supabase/migrations/012_order_artikelen.sql

CREATE TABLE order_artikelen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  naam text NOT NULL,
  berekening_type text NOT NULL CHECK (berekening_type IN ('delen', 'vermenigvuldigen')),
  factor numeric(10,4) NOT NULL CHECK (factor > 0),
  volgorde integer NOT NULL DEFAULT 0,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_artikelen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can manage order_artikelen"
  ON order_artikelen FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
