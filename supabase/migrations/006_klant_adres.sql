-- Voeg adresvelden toe aan klanten (allemaal leeg als default zodat bestaande klanten werken)
ALTER TABLE klanten
  ADD COLUMN adres text NOT NULL DEFAULT '',
  ADD COLUMN postcode text NOT NULL DEFAULT '',
  ADD COLUMN stad text NOT NULL DEFAULT '',
  ADD COLUMN land text NOT NULL DEFAULT '';
