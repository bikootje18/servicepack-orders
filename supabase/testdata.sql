-- ============================================================
-- TESTDATA — New Order System
-- Plak dit in Supabase SQL Editor en klik Run
-- ============================================================

-- Klanten
INSERT INTO klanten (id, naam, adres, postcode, stad, land) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Albert Heijn B.V.',       'Provincialeweg 11', '1506 MA', 'Zaandam',    'Nederland'),
  ('a1000000-0000-0000-0000-000000000002', 'Jumbo Supermarkten B.V.', 'Rijksweg 15',       '5462 CE', 'Veghel',     'Nederland'),
  ('a1000000-0000-0000-0000-000000000003', 'Lidl Nederland GmbH',     'Jurisdictieweg 4',  '4131 NC', 'Vianen',     'Nederland');

-- Facturatie codes
INSERT INTO facturatie_codes (id, code, omschrijving, tarief, actief) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'STD-01',  'Standaard verpakking',        0.0850, true),
  ('b1000000-0000-0000-0000-000000000002', 'BIO-01',  'Bio verpakking',              0.1100, true),
  ('b1000000-0000-0000-0000-000000000003', 'OPWK-01', 'Opwerken + herverpakken',     0.1450, true),
  ('b1000000-0000-0000-0000-000000000004', 'PALL-01', 'Palletiseren',                0.0650, true);

-- Orders
INSERT INTO orders (id, order_nummer, order_code, klant_id, facturatie_code_id, order_grootte, aantal_per_doos, aantal_per_inner, aantal_per_pallet, bewerking, opwerken, bio, omschrijving, status, locatie, deadline, tht) VALUES

  -- In behandeling
  ('c1000000-0000-0000-0000-000000000001', 'SP-2026-001', 'AH-BIO-4421',
   'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
   5000, 12, 6, 480, '', false, true, 'Biologische havermelk 1L', 'in_behandeling', 'Lokkerdreef20', '2026-04-15', '2026-10-01'),

  ('c1000000-0000-0000-0000-000000000002', 'SP-2026-002', 'JMB-STD-8810',
   'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001',
   12000, 24, 6, 960, '', false, false, 'Rijstwafels naturel 100g', 'in_behandeling', 'Pauvreweg', '2026-04-12', '2026-09-15'),

  ('c1000000-0000-0000-0000-000000000003', 'SP-2026-003', 'LIDL-OPW-3301',
   'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003',
   3000, 6, 0, 250, 'Etiket vervangen + hersealen', true, false, 'Graanrepen met noten', 'in_behandeling', 'WVB', '2026-04-10', '2026-08-20'),

  -- Bevestigd (aankomend)
  ('c1000000-0000-0000-0000-000000000004', 'SP-2026-004', 'AH-STD-5512',
   'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   8000, 12, 4, 640, '', false, false, 'Crackers sesam 200g', 'bevestigd', 'Lokkerdreef20', '2026-04-22', '2026-11-01'),

  ('c1000000-0000-0000-0000-000000000005', 'SP-2026-005', 'JMB-BIO-9920',
   'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002',
   2500, 10, 0, 200, '', false, true, 'Bio amandelpasta 250g', 'bevestigd', 'Pauvreweg', '2026-04-25', '2026-12-01'),

  -- Concept
  ('c1000000-0000-0000-0000-000000000006', 'SP-2026-006', 'LIDL-PALL-7701',
   'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004',
   20000, 24, 8, 1200, '', false, false, 'Chips naturel 200g — palletiseren', 'concept', 'WVB', '2026-05-01', null),

  -- Geleverd
  ('c1000000-0000-0000-0000-000000000007', 'SP-2026-007', 'AH-STD-1100',
   'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   6000, 12, 6, 480, '', false, false, 'Volkoren beschuit 75g', 'geleverd', 'Lokkerdreef20', '2026-03-30', '2026-09-01');

-- Leveringen
INSERT INTO leveringen (id, order_id, aantal_geleverd, leverdatum, notities, tht) VALUES
  -- SP-2026-001: 2 deelleveringen, 3000 van 5000 gereed
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 2000, '2026-04-03', '', '2026-10-01'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 1000, '2026-04-05', 'Tweede batch', '2026-10-01'),

  -- SP-2026-002: 1 levering, 5000 van 12000
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 5000, '2026-04-04', '', null),

  -- SP-2026-003: 1 levering, 1500 van 3000
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', 1500, '2026-04-06', 'Eerste batch opgewerkt', null),

  -- SP-2026-007: volledig geleverd
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000007', 6000, '2026-03-28', 'Volledig geleverd in één keer', '2026-09-01');

-- Artikelen (voor SP-2026-001)
INSERT INTO order_artikelen (order_id, naam, berekening_type, factor, volgorde) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Dozen',    'delen',           12, 1),
  ('c1000000-0000-0000-0000-000000000001', 'Inners',   'delen',           6,  2),
  ('c1000000-0000-0000-0000-000000000001', 'Pallets',  'delen',           480, 3);
