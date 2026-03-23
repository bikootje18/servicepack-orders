-- Sample klanten
INSERT INTO klanten (naam) VALUES
  ('Bedrijf Alpha BV'),
  ('Beta Logistics NV'),
  ('Gamma Foods BV');

-- Sample facturatie codes
INSERT INTO facturatie_codes (code, omschrijving, tarief) VALUES
  ('alpha_sticker_laptop01', 'Laptop stickers Alpha', 0.85),
  ('beta_label_fles01', 'Fles labelen Beta', 0.45),
  ('gamma_verpak_doos01', 'Dozen verpakken Gamma', 1.20);
