-- Add portal_user_id to klanten
ALTER TABLE klanten
ADD COLUMN portal_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Klanten: restrict portal users to their own record only
DROP POLICY "Authenticated users can do everything on klanten" ON klanten;

CREATE POLICY "Staff heeft volledige toegang tot klanten"
  ON klanten FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

CREATE POLICY "Klant ziet eigen klantrecord"
  ON klanten FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'klant'
    AND portal_user_id = auth.uid()
  );

-- Orders: restrict portal users to their own orders, read-only
DROP POLICY "Authenticated users can do everything on orders" ON orders;

CREATE POLICY "Staff heeft volledige toegang tot orders"
  ON orders FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

CREATE POLICY "Klant ziet eigen orders"
  ON orders FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'klant'
    AND klant_id = (SELECT id FROM klanten WHERE portal_user_id = auth.uid())
  );

-- Leveringen: restrict portal users to leveringen of their own orders, read-only
DROP POLICY "Authenticated users can do everything on leveringen" ON leveringen;

CREATE POLICY "Staff heeft volledige toegang tot leveringen"
  ON leveringen FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

CREATE POLICY "Klant ziet eigen leveringen"
  ON leveringen FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'klant'
    AND order_id IN (
      SELECT id FROM orders
      WHERE klant_id = (SELECT id FROM klanten WHERE portal_user_id = auth.uid())
    )
  );
