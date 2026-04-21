-- supabase/migrations/028_productdefinities.sql

CREATE TABLE productdefinities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publiceren boolean NOT NULL DEFAULT true,
  art_nr text NOT NULL UNIQUE,
  omschrijving_eindproduct text NOT NULL DEFAULT '',
  art_grondstof text NOT NULL DEFAULT '',
  omschrijving_grondstof text NOT NULL DEFAULT '',
  grondstof_per_he numeric(10,6) NOT NULL DEFAULT 0,
  tray_1_code text NOT NULL DEFAULT '',
  tray_1_per_he integer NOT NULL DEFAULT 0,
  tray_1_omschrijving text NOT NULL DEFAULT '',
  tray_2_code text NOT NULL DEFAULT '',
  tray_2_per_he integer NOT NULL DEFAULT 0,
  tray_2_omschrijving text NOT NULL DEFAULT '',
  ean_he text NOT NULL DEFAULT '',
  label_1_per_he integer NOT NULL DEFAULT 0,
  ean_ce text NOT NULL DEFAULT '',
  label_2_per_he integer NOT NULL DEFAULT 0,
  per_laag integer NOT NULL DEFAULT 0,
  lagen integer NOT NULL DEFAULT 0,
  per_pallet integer NOT NULL DEFAULT 0,
  lading_drager text NOT NULL DEFAULT '',
  tussenlegvel boolean NOT NULL DEFAULT false,
  hoekprofiel boolean NOT NULL DEFAULT false,
  spiegelen boolean NOT NULL DEFAULT false,
  tarief_service_pack numeric(10,5) NOT NULL DEFAULT 0,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE productdefinities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can read productdefinities"
  ON productdefinities FOR SELECT TO authenticated
  USING (true);
