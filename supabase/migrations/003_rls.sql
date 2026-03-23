-- Enable RLS on all tables
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturatie_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profielen ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveringen ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;

-- All authenticated users have full access
CREATE POLICY "Authenticated users can do everything on klanten"
  ON klanten FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on facturatie_codes"
  ON facturatie_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can read all profielen"
  ON profielen FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profiel"
  ON profielen FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated users can do everything on orders"
  ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on leveringen"
  ON leveringen FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on facturen"
  ON facturen FOR ALL TO authenticated USING (true) WITH CHECK (true);
