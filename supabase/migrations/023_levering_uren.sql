-- Uren per gereedmelding voor nacalculatie
ALTER TABLE leveringen ADD COLUMN uren numeric(6, 2) DEFAULT NULL;
