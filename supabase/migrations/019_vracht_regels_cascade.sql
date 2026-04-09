-- Voeg ON DELETE CASCADE toe aan vracht_regels.levering_id
ALTER TABLE vracht_regels
  DROP CONSTRAINT vracht_regels_levering_id_fkey;

ALTER TABLE vracht_regels
  ADD CONSTRAINT vracht_regels_levering_id_fkey
  FOREIGN KEY (levering_id) REFERENCES leveringen(id) ON DELETE CASCADE;
