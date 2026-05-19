-- WVS gesplitst in WVS Etten-Leur en WVS Roosendaal.
-- Bestaande WVS-orders worden naar WVS Etten-Leur verplaatst.
UPDATE orders SET locatie = 'WVSEttenLeur' WHERE locatie = 'WVS';

ALTER TABLE orders DROP CONSTRAINT orders_locatie_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_locatie_check
  CHECK (locatie IN ('Lokkerdreef20', 'Pauvreweg', 'WVB', 'Darero', 'WVSEttenLeur', 'WVSRoosendaal', 'Rotterdam', 'Sittard', 'Gilze'));
