-- Voeg locatie, deadline en tht toe aan orders
ALTER TABLE orders
  ADD COLUMN locatie text CHECK (locatie IN ('Lokkerdreef20', 'Pauvreweg', 'WVB')),
  ADD COLUMN deadline date,
  ADD COLUMN tht date;

-- Voeg tht toe aan leveringen (afwijkende tht per levering)
ALTER TABLE leveringen
  ADD COLUMN tht date;
