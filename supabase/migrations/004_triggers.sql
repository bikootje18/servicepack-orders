-- Auto-update order status to 'geleverd' when all units are delivered
CREATE OR REPLACE FUNCTION check_order_geleverd()
RETURNS TRIGGER AS $$
DECLARE
  totaal_geleverd integer;
  order_grootte integer;
BEGIN
  SELECT COALESCE(SUM(aantal_geleverd), 0)
  INTO totaal_geleverd
  FROM leveringen
  WHERE order_id = NEW.order_id;

  SELECT o.order_grootte INTO order_grootte
  FROM orders o WHERE o.id = NEW.order_id;

  IF totaal_geleverd >= order_grootte THEN
    UPDATE orders SET status = 'geleverd'
    WHERE id = NEW.order_id AND status NOT IN ('geleverd', 'gefactureerd');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_order_geleverd
  AFTER INSERT OR UPDATE ON leveringen
  FOR EACH ROW EXECUTE FUNCTION check_order_geleverd();

-- Auto-update order status to 'gefactureerd' when all deliveries are invoiced
CREATE OR REPLACE FUNCTION check_order_gefactureerd()
RETURNS TRIGGER AS $$
DECLARE
  ongefactureerd integer;
BEGIN
  SELECT COUNT(*) INTO ongefactureerd
  FROM leveringen
  WHERE order_id = NEW.order_id AND factuur_id IS NULL;

  IF ongefactureerd = 0 THEN
    UPDATE orders SET status = 'gefactureerd'
    WHERE id = NEW.order_id AND status = 'geleverd';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_order_gefactureerd
  AFTER UPDATE OF factuur_id ON leveringen
  FOR EACH ROW EXECUTE FUNCTION check_order_gefactureerd();
