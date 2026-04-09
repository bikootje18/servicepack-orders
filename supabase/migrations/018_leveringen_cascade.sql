-- Voeg ON DELETE CASCADE toe aan leveringen.order_id
-- Zodat een order met leveringen kan worden verwijderd
ALTER TABLE leveringen
  DROP CONSTRAINT leveringen_order_id_fkey;

ALTER TABLE leveringen
  ADD CONSTRAINT leveringen_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
