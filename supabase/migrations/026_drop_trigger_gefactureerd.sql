-- Remove automatic 'gefactureerd' promotion trigger.
-- Invoicing is handled in an external system; this trigger was hiding active orders.
DROP TRIGGER IF EXISTS trigger_check_order_gefactureerd ON leveringen;
DROP FUNCTION IF EXISTS check_order_gefactureerd();
