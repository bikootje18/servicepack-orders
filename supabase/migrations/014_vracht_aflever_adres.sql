-- Afleveradres override per vracht
-- NULL = gebruik klantadres als default
ALTER TABLE vrachten
  ADD COLUMN aflever_naam      text,
  ADD COLUMN aflever_adres     text,
  ADD COLUMN aflever_postcode  text,
  ADD COLUMN aflever_stad      text,
  ADD COLUMN aflever_land      text;
