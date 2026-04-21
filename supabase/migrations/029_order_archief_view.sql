-- View die per order aangeeft of er een vracht aan gekoppeld is
CREATE OR REPLACE VIEW order_heeft_vracht AS
SELECT DISTINCT o.id AS order_id
FROM orders o
JOIN leveringen l ON l.order_id = o.id
JOIN vracht_regels vr ON vr.levering_id = l.id;
