-- Breid de locatie check constraint uit met alle locaties uit de applicatie
ALTER TABLE orders DROP CONSTRAINT orders_locatie_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_locatie_check
  CHECK (locatie IN ('Lokkerdreef20', 'Pauvreweg', 'WVB', 'Darero', 'WVS', 'Rotterdam', 'Sittard', 'Gilze'));
