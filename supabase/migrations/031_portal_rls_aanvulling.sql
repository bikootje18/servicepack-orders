-- Fix 1: Restrict facturen access to staff only
DROP POLICY "Authenticated users can do everything on facturen" ON facturen;

CREATE POLICY "Staff heeft volledige toegang tot facturen"
  ON facturen FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

-- Fix 2: Restrict facturatie_codes access to staff only
DROP POLICY "Authenticated users can do everything on facturatie_codes" ON facturatie_codes;

CREATE POLICY "Staff heeft volledige toegang tot facturatie_codes"
  ON facturatie_codes FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

-- Fix 2: Restrict vrachten access to staff only
DROP POLICY "Authenticated users can do everything on vrachten" ON vrachten;

CREATE POLICY "Staff heeft volledige toegang tot vrachten"
  ON vrachten FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

-- Fix 2: Restrict vracht_regels access to staff only
DROP POLICY "Authenticated users can do everything on vracht_regels" ON vracht_regels;

CREATE POLICY "Staff heeft volledige toegang tot vracht_regels"
  ON vracht_regels FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

-- Fix 2: Restrict order_artikelen access to staff only
DROP POLICY "authenticated users can manage order_artikelen" ON order_artikelen;

CREATE POLICY "Staff heeft volledige toegang tot order_artikelen"
  ON order_artikelen FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

-- Fix 3: Enable RLS and restrict give_x_imports access to staff only
ALTER TABLE give_x_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff heeft volledige toegang tot give_x_imports"
  ON give_x_imports FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');
