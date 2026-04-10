-- Revert order status when a levering is deleted and total delivered drops below order size
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
    WHERE id = OLD.order_id AND status = 'geleverd';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_order_status_na_delete
  AFTER DELETE ON leveringen
  FOR EACH ROW EXECUTE FUNCTION check_order_status_na_delete();
