-- Fix: revert order status also when status is 'gefactureerd' (not just 'geleverd')
-- When a levering is deleted and total drops below order_grootte,
-- the order should revert to 'in_behandeling' regardless of current status.
CREATE OR REPLACE FUNCTION check_order_status_na_delete()
RETURNS TRIGGER AS $$
DECLARE
  totaal_geleverd integer;
  order_grootte   integer;
BEGIN
  SELECT COALESCE(SUM(aantal_geleverd), 0)
  INTO totaal_geleverd
  FROM leveringen
  WHERE order_id = OLD.order_id;

  SELECT o.order_grootte INTO order_grootte
  FROM orders o WHERE o.id = OLD.order_id;

  IF totaal_geleverd < order_grootte THEN
    UPDATE orders SET status = 'in_behandeling'
    WHERE id = OLD.order_id AND status IN ('geleverd', 'gefactureerd');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- One-time fix: correct existing orders where status is 'geleverd' or 'gefactureerd'
-- but total delivered is less than order_grootte
UPDATE orders o
SET status = 'in_behandeling'
WHERE o.status IN ('geleverd', 'gefactureerd')
AND (
  SELECT COALESCE(SUM(l.aantal_geleverd), 0)
  FROM leveringen l
  WHERE l.order_id = o.id
) < o.order_grootte;
